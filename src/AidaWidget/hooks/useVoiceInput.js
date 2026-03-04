// src/AidaWidget/hooks/useVoiceInput.js
import { useState, useRef, useCallback, useEffect } from 'react';
import { useVAD } from './useVAD';

const MAX_RECORDING_SECONDS = 600;
const WARNING_THRESHOLD_SECONDS = 540;

/**
 * Manages voice input, including recording state, timer, VAD-based auto-stop,
 * and transcription.
 *
 * @param {object} config
 * @param {string}   config.transcriptionUrl          - The URL for the transcription API.
 * @param {Function} config.onTranscriptionComplete   - Callback fired with the transcribed text.
 * @returns An object with voice input state and control functions.
 */
export const useVoiceInput = ({ transcriptionUrl, onTranscriptionComplete }) => {
    const [isRecording, setIsRecording] = useState(false);
    const [isTranscribing, setIsTranscribing] = useState(false);
    const [elapsedTime, setElapsedTime] = useState(0);
    const [transcriptionError, setTranscriptionError] = useState(null);
    const [failedAudioBlob, setFailedAudioBlob] = useState(null);
    const [isNearingTimeLimit, setIsNearingTimeLimit] = useState(false);

    const mediaRecorderRef = useRef(null);
    const streamRef = useRef(null);
    const audioChunksRef = useRef([]);
    const timerIntervalRef = useRef(null);
    const lastInputWasVoiceRef = useRef(false);
    const transcriptionAbortControllerRef = useRef(null);
    const autoStopTimerRef = useRef(null);

    // ─── VAD integration ────────────────────────────────────────────────────────
    // We only activate VAD while recording is active.
    const handleVADSilenceTimeout = useCallback(() => {
        // Called by VAD when silence countdown reaches zero — stop the recording.
        if (mediaRecorderRef.current?.state === 'recording') {
            stopRecording(); // defined below; safe because of hoisting via useCallback deps
        }
    }, []); // eslint-disable-line react-hooks/exhaustive-deps
    // Note: stopRecording is defined after this; we use a ref trick below.

    const stopRecordingRef = useRef(null);

    const { silenceCountdown, vadStatus, cancelSilenceCountdown } = useVAD({
        isEnabled: isRecording,
        onSilenceTimeout: useCallback(() => {
            stopRecordingRef.current?.();
        }, []),
    });
    // ────────────────────────────────────────────────────────────────────────────

    const transcribeAudioBlob = useCallback(async (audioBlob) => {
        if (audioBlob.size === 0) {
            console.warn('Audio blob is empty, skipping transcription.');
            return;
        }

        setIsTranscribing(true);
        setTranscriptionError(null);
        setFailedAudioBlob(null);

        const formData = new FormData();
        formData.append('audio_file', audioBlob, 'recording.webm');

        const abortController = new AbortController();
        transcriptionAbortControllerRef.current = abortController;

        try {
            const response = await fetch(transcriptionUrl, {
                method: 'POST',
                body: formData,
                signal: abortController.signal,
            });
            if (!response.ok) throw new Error(`Transcription failed: ${response.statusText}`);

            const result = await response.json();

            const data =
                typeof result._HttpResponse__body === 'string'
                    ? JSON.parse(result._HttpResponse__body)
                    : result;

            const transcriptionText = data?.text || data?.transcription?.text || '';

            if (onTranscriptionComplete) {
                onTranscriptionComplete(transcriptionText);
            }
        } catch (error) {
            if (error.name === 'AbortError') {
                console.info('Transcription was cancelled by the user.');
            } else {
                console.error('Transcription error:', error);
                setTranscriptionError(error.message || 'Transcription failed.');
                setFailedAudioBlob(audioBlob);
            }
        } finally {
            setIsTranscribing(false);
            transcriptionAbortControllerRef.current = null;
        }
    }, [transcriptionUrl, onTranscriptionComplete]);

    const stopRecording = useCallback(() => {
        if (mediaRecorderRef.current?.state === 'recording') {
            mediaRecorderRef.current.stop();
        }
        if (streamRef.current) {
            streamRef.current.getTracks().forEach((track) => track.stop());
            streamRef.current = null;
        }
        if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
        if (autoStopTimerRef.current) {
            clearTimeout(autoStopTimerRef.current);
            autoStopTimerRef.current = null;
        }

        setIsRecording(false);
    }, []);

    // Keep the ref in sync so the VAD callback can always call the latest version
    useEffect(() => {
        stopRecordingRef.current = stopRecording;
    }, [stopRecording]);

    const startRecording = useCallback(async () => {
        setTranscriptionError(null);
        setFailedAudioBlob(null);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamRef.current = stream;

            const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
            mediaRecorderRef.current = recorder;
            audioChunksRef.current = [];

            recorder.ondataavailable = (e) => {
                if (e.data.size > 0) audioChunksRef.current.push(e.data);
            };
            recorder.onstart = () => {
                lastInputWasVoiceRef.current = true;
                setIsRecording(true);
                setElapsedTime(0);
                setIsNearingTimeLimit(false);
                timerIntervalRef.current = setInterval(
                    () => setElapsedTime((p) => p + 1),
                    1000
                );

                // Hard cap: auto-stop after MAX_RECORDING_SECONDS regardless of VAD
                autoStopTimerRef.current = setTimeout(() => {
                    console.log('Recording time limit reached. Stopping automatically.');
                    stopRecordingRef.current?.();
                }, MAX_RECORDING_SECONDS * 1000);
            };
            recorder.onstop = () => {
                transcribeAudioBlob(
                    new Blob(audioChunksRef.current, { type: 'audio/webm' })
                );
            };
            recorder.start();
        } catch (err) {
            console.error('Microphone access error:', err);
            alert(
                'Could not access the microphone. Please check your browser permissions.'
            );
        }
    }, [transcribeAudioBlob]);

    const cancelTranscription = useCallback(() => {
        if (transcriptionAbortControllerRef.current) {
            transcriptionAbortControllerRef.current.abort();
        }
    }, []);

    const retryTranscription = useCallback(() => {
        if (failedAudioBlob) {
            transcribeAudioBlob(failedAudioBlob);
        }
    }, [failedAudioBlob, transcribeAudioBlob]);

    const clearFailedTranscription = useCallback(() => {
        setTranscriptionError(null);
        setFailedAudioBlob(null);
    }, []);

    // Warning threshold effect
    useEffect(() => {
        if (isRecording && elapsedTime >= WARNING_THRESHOLD_SECONDS) {
            if (!isNearingTimeLimit) setIsNearingTimeLimit(true);
        } else if (isNearingTimeLimit) {
            setIsNearingTimeLimit(false);
        }
    }, [elapsedTime, isRecording, isNearingTimeLimit]);

    // General cleanup
    useEffect(
        () => () => {
            if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
            if (autoStopTimerRef.current) clearTimeout(autoStopTimerRef.current);
            if (streamRef.current) {
                streamRef.current.getTracks().forEach((track) => track.stop());
            }
        },
        []
    );

    return {
        isRecording,
        isTranscribing,
        elapsedTime,
        startRecording,
        stopRecording,
        cancelTranscription,
        lastInputWasVoiceRef,
        transcriptionError,
        retryTranscription,
        clearFailedTranscription,
        isNearingTimeLimit,
        // VAD-specific
        silenceCountdown,
        vadStatus,
        cancelSilenceCountdown,
    };
};
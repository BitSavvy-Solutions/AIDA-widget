/* src/AidaWidget/hooks/useVoiceInput.js */
import { useState, useRef, useCallback, useEffect } from 'react';
import { useVAD } from './useVAD';

const MAX_RECORDING_SECONDS = 600;
const WARNING_THRESHOLD_SECONDS = 540;

export const useVoiceInput = ({ transcriptionUrl, onTranscriptionComplete }) => {
    const [isRecording, setIsRecording] = useState(false);
    const [isTranscribing, setIsTranscribing] = useState(false);
    const [elapsedTime, setElapsedTime] = useState(0);
    const [transcriptionError, setTranscriptionError] = useState(null);
    const [failedAudioBlob, setFailedAudioBlob] = useState(null);
    const [isNearingTimeLimit, setIsNearingTimeLimit] = useState(false);
    
    // ✅ NEW: State for volume level (0 to 100)
    const [voiceVolume, setVoiceVolume] = useState(0);

    const mediaRecorderRef = useRef(null);
    const streamRef = useRef(null);
    const audioChunksRef = useRef([]);
    const timerIntervalRef = useRef(null);
    const lastInputWasVoiceRef = useRef(false);
    const transcriptionAbortControllerRef = useRef(null);
    const autoStopTimerRef = useRef(null);
    
    // ✅ NEW: Refs for Audio Analysis
    const audioContextRef = useRef(null);
    const analyserRef = useRef(null);
    const sourceRef = useRef(null);
    const animationFrameRef = useRef(null);

    const stopRecordingRef = useRef(null);

    // ... (VAD logic remains the same) ...
    const { silenceCountdown, vadStatus, cancelSilenceCountdown } = useVAD({
        isEnabled: isRecording,
        onSilenceTimeout: useCallback(() => {
            stopRecordingRef.current?.();
        }, []),
    });

    // ... (transcribeAudioBlob remains the same) ...
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
            const data = typeof result._HttpResponse__body === 'string'
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

    // ✅ NEW: Function to analyze audio volume
    const analyzeAudio = useCallback(() => {
        if (!analyserRef.current) return;

        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(dataArray);

        // Calculate average volume
        let sum = 0;
        // We only check the lower half of frequencies where voice usually lives
        const length = dataArray.length / 2; 
        for (let i = 0; i < length; i++) {
            sum += dataArray[i];
        }
        const average = sum / length;
        
        // Normalize to 0-100 range (approximate)
        // 255 is max byte data, but average voice is usually lower
        const volume = Math.min(100, Math.round((average / 60) * 100));
        
        setVoiceVolume(volume);
        animationFrameRef.current = requestAnimationFrame(analyzeAudio);
    }, []);

    const stopRecording = useCallback(() => {
        if (mediaRecorderRef.current?.state === 'recording') {
            mediaRecorderRef.current.stop();
        }
        
        // ✅ NEW: Cleanup Audio Context
        if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
        if (sourceRef.current) { sourceRef.current.disconnect(); sourceRef.current = null; }
        if (analyserRef.current) { analyserRef.current.disconnect(); analyserRef.current = null; }
        if (audioContextRef.current) { audioContextRef.current.close(); audioContextRef.current = null; }
        setVoiceVolume(0);

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

    useEffect(() => {
        stopRecordingRef.current = stopRecording;
    }, [stopRecording]);

    const startRecording = useCallback(async () => {
        setTranscriptionError(null);
        setFailedAudioBlob(null);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamRef.current = stream;

            // ✅ NEW: Setup Audio Context for visualization
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            const audioCtx = new AudioContext();
            const analyser = audioCtx.createAnalyser();
            const source = audioCtx.createMediaStreamSource(stream);
            
            analyser.fftSize = 256;
            analyser.smoothingTimeConstant = 0.5; // Smooths out the animation
            source.connect(analyser);
            
            audioContextRef.current = audioCtx;
            analyserRef.current = analyser;
            sourceRef.current = source;
            
            // Start analysis loop
            analyzeAudio();

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
            alert('Could not access the microphone. Please check your browser permissions.');
        }
    }, [transcriptionUrl, analyzeAudio, transcribeAudioBlob]); // Added analyzeAudio dependency

    // ... (rest of the hook remains the same: cancelTranscription, retryTranscription, etc.) ...
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

    useEffect(() => {
        if (isRecording && elapsedTime >= WARNING_THRESHOLD_SECONDS) {
            if (!isNearingTimeLimit) setIsNearingTimeLimit(true);
        } else if (isNearingTimeLimit) {
            setIsNearingTimeLimit(false);
        }
    }, [elapsedTime, isRecording, isNearingTimeLimit]);

    useEffect(
        () => () => {
            if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
            if (autoStopTimerRef.current) clearTimeout(autoStopTimerRef.current);
            if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current); // Cleanup animation
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
        silenceCountdown,
        vadStatus,
        cancelSilenceCountdown,
        voiceVolume, // ✅ EXPORTED
    };
};
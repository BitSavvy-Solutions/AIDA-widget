/* src/AidaWidget/hooks/useVoiceInput.js */
import { useState, useRef, useCallback, useEffect } from 'react';

/**
 * Manages voice input, including recording state, timer, and transcription.
 * @param {object} config - Configuration object.
 * @param {string} config.transcriptionUrl - The URL for the transcription API.
 * @param {Function} config.onTranscriptionComplete - Callback fired with the transcribed text.
 * @returns An object with voice input state and control functions.
 */
export const useVoiceInput = ({ transcriptionUrl, onTranscriptionComplete }) => {
    const [isRecording, setIsRecording] = useState(false);
    const [isTranscribing, setIsTranscribing] = useState(false);
    const [elapsedTime, setElapsedTime] = useState(0);
    // ✨ ADDED: State for transcription failure
    const [transcriptionError, setTranscriptionError] = useState(null);
    const [failedAudioBlob, setFailedAudioBlob] = useState(null);

    const mediaRecorderRef = useRef(null);
    const streamRef = useRef(null);
    const audioChunksRef = useRef([]);
    const timerIntervalRef = useRef(null);
    const lastInputWasVoiceRef = useRef(false);
    const transcriptionAbortControllerRef = useRef(null);

    const transcribeAudioBlob = useCallback(async (audioBlob) => {
        if (audioBlob.size === 0) {
            console.warn("Audio blob is empty, skipping transcription.");
            return;
        }

        setIsTranscribing(true);
        // ✨ ADDED: Reset error state on new attempt
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
                signal: abortController.signal
            });
            if (!response.ok) throw new Error(`Transcription failed: ${response.statusText}`);

            const result = await response.json();
            const data = typeof result._HttpResponse__body === 'string'
                ? JSON.parse(result._HttpResponse__body)
                : result;
            const transcriptionText = data?.transcription?.text || '';
            
            if (onTranscriptionComplete) {
                onTranscriptionComplete(transcriptionText);
            }
        } catch (error) {
            if (error.name === 'AbortError') {
                console.info("Transcription was cancelled by the user.");
            } else {
                console.error('Transcription error:', error);
                // ✨ MODIFIED: Set error state instead of alerting
                setTranscriptionError(error.message || "Transcription failed.");
                setFailedAudioBlob(audioBlob);
            }
        } finally {
            // ✨ MODIFIED: Always stop the 'transcribing' state indicator
            setIsTranscribing(false);
            transcriptionAbortControllerRef.current = null;
        }
    }, [transcriptionUrl, onTranscriptionComplete]);


    const stopRecording = useCallback(() => {
        if (mediaRecorderRef.current?.state === "recording") {
            mediaRecorderRef.current.stop(); // This will trigger the 'onstop' event
        }
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
        setIsRecording(false);
    }, []);

    const startRecording = useCallback(async () => {
        // ✨ ADDED: Clear any previous error when starting a new recording
        setTranscriptionError(null);
        setFailedAudioBlob(null);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamRef.current = stream;

            const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
            mediaRecorderRef.current = recorder;
            audioChunksRef.current = [];

            recorder.ondataavailable = e => {
                if (e.data.size > 0) audioChunksRef.current.push(e.data);
            };
            recorder.onstart = () => {
                lastInputWasVoiceRef.current = true;
                setIsRecording(true);
                setElapsedTime(0);
                timerIntervalRef.current = setInterval(() => setElapsedTime(p => p + 1), 1000);
            };
            recorder.onstop = () => {
                transcribeAudioBlob(new Blob(audioChunksRef.current, { type: 'audio/webm' }));
            };
            recorder.start();
        } catch (err) {
            console.error("Microphone access error:", err);
            alert("Could not access the microphone. Please check your browser permissions.");
        }
    }, [transcribeAudioBlob]);

    const cancelTranscription = useCallback(() => {
        if (transcriptionAbortControllerRef.current) {
            transcriptionAbortControllerRef.current.abort();
        }
    }, []);

    // ✨ ADDED: Function to retry transcription
    const retryTranscription = useCallback(() => {
        if (failedAudioBlob) {
            transcribeAudioBlob(failedAudioBlob);
        }
    }, [failedAudioBlob, transcribeAudioBlob]);

    // ✨ ADDED: Function to clear the failed state
    const clearFailedTranscription = useCallback(() => {
        setTranscriptionError(null);
        setFailedAudioBlob(null);
    }, []);

    // General cleanup effect for intervals and media streams
    useEffect(() => () => {
        if(timerIntervalRef.current) clearInterval(timerIntervalRef.current);
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
        }
    }, []);

    return {
        isRecording,
        isTranscribing,
        elapsedTime,
        startRecording,
        stopRecording,
        cancelTranscription,
        lastInputWasVoiceRef,
        // ✨ ADDED: Expose new state and handlers
        transcriptionError,
        retryTranscription,
        clearFailedTranscription,
    };
};
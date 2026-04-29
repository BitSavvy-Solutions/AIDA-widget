/* src/AidaWidget/hooks/useVoiceInput.js */
import { useState, useRef, useCallback, useEffect } from 'react';

const MAX_RECORDING_SECONDS = 600;
const WARNING_THRESHOLD_SECONDS = 540;

export const useVoiceInput = ({ transcriptionUrl, selectedAudioModel, onTranscriptionComplete }) => {
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

    const transcribeAudioBlob = useCallback(async (audioBlob) => {
        if (audioBlob.size === 0) {
            console.warn("Audio blob is empty, skipping transcription.");
            return;
        }

        setIsTranscribing(true);
        setTranscriptionError(null);
        setFailedAudioBlob(null);
        
        const formData = new FormData();
        formData.append('audio_file', audioBlob, 'recording.webm');
        
        // ✅ UPDATED: Parse the model and mode from the selectedAudioModel string
        if (selectedAudioModel) {
            if (selectedAudioModel.includes('|')) {
                const [modelName, mode] = selectedAudioModel.split('|');
                formData.append('model', modelName);
                formData.append('mode', mode);
            } else {
                formData.append('model', selectedAudioModel);
                formData.append('mode', 'transcribe'); // Default mode
            }
        }

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

            const transcriptionText = data?.text || data?.transcription?.text || '';
            
            if (onTranscriptionComplete) {
                onTranscriptionComplete(transcriptionText);
            }
        } catch (error) {
            if (error.name === 'AbortError') {
                console.info("Transcription was cancelled by the user.");
            } else {
                console.error('Transcription error:', error);
                setTranscriptionError(error.message || "Transcription failed.");
                setFailedAudioBlob(audioBlob);
            }
        } finally {
            setIsTranscribing(false);
            transcriptionAbortControllerRef.current = null;
        }
    }, [transcriptionUrl, selectedAudioModel, onTranscriptionComplete]);

    // ... (rest of the hook remains exactly the same)
    
    const stopRecording = useCallback(() => {
        if (mediaRecorderRef.current?.state === "recording") {
            mediaRecorderRef.current.stop();
        }
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);

        if (autoStopTimerRef.current) {
            clearTimeout(autoStopTimerRef.current);
            autoStopTimerRef.current = null;
        }

        setIsRecording(false);
    }, []);

    const startRecording = useCallback(async () => {
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
                setIsNearingTimeLimit(false);
                timerIntervalRef.current = setInterval(() => setElapsedTime(p => p + 1), 1000);

                autoStopTimerRef.current = setTimeout(() => {
                    console.log("Recording time limit reached. Stopping automatically.");
                    stopRecording();
                }, MAX_RECORDING_SECONDS * 1000);
            };
            recorder.onstop = () => {
                transcribeAudioBlob(new Blob(audioChunksRef.current, { type: 'audio/webm' }));
            };
            recorder.start();
        } catch (err) {
            console.error("Microphone access error:", err);
            alert("Could not access the microphone. Please check your browser permissions.");
        }
    }, [transcribeAudioBlob, stopRecording]);

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
            if (!isNearingTimeLimit) {
                setIsNearingTimeLimit(true);
            }
        } else if (isNearingTimeLimit) {
            setIsNearingTimeLimit(false);
        }
    }, [elapsedTime, isRecording, isNearingTimeLimit]);

    useEffect(() => () => {
        if(timerIntervalRef.current) clearInterval(timerIntervalRef.current);
        if(autoStopTimerRef.current) clearTimeout(autoStopTimerRef.current);
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
        transcriptionError,
        retryTranscription,
        clearFailedTranscription,
        isNearingTimeLimit,
    };
};
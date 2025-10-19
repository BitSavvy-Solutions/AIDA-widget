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

    const mediaRecorderRef = useRef(null);
    const streamRef = useRef(null);
    const audioChunksRef = useRef([]);
    const timerIntervalRef = useRef(null);
    const lastInputWasVoiceRef = useRef(false);

    const transcribeAudioBlob = useCallback(async (audioBlob) => {
        if (audioBlob.size === 0) {
            console.warn("Audio blob is empty, skipping transcription.");
            return;
        }

        setIsTranscribing(true);
        const formData = new FormData();
        formData.append('audio_file', audioBlob, 'recording.webm');

        try {
            const response = await fetch(transcriptionUrl, { method: 'POST', body: formData });
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
            console.error('Transcription error:', error);
            alert("Sorry, I couldn't understand that. Please try again.");
        } finally {
            setIsTranscribing(false);
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
        lastInputWasVoiceRef,
    };
};
/* src/AidaWidget/hooks/useVoiceInput.js */
import { useState, useRef, useCallback, useEffect } from 'react';

const MAX_RECORDING_SECONDS = 600;
const WARNING_THRESHOLD_SECONDS = 540;

export const useVoiceInput = ({ transcriptionUrl, selectedAudioModel }) => {
    const [isRecording, setIsRecording] = useState(false);
    const [elapsedTime, setElapsedTime] = useState(0);
    const [recordings, setRecordings] = useState([]);
    const [isNearingTimeLimit, setIsNearingTimeLimit] = useState(false);

    const mediaRecorderRef = useRef(null);
    const streamRef = useRef(null);
    const audioChunksRef = useRef([]);
    const timerIntervalRef = useRef(null);
    const autoStopTimerRef = useRef(null);
    const elapsedTimeRef = useRef(0);
    const abortControllersRef = useRef({});

    const transcribeAudioBlob = useCallback(async (id, audioBlob) => {
        if (audioBlob.size === 0) return;

        setRecordings(prev => prev.map(r => r.id === id ? { ...r, isTranscribing: true, error: null } : r));

        const formData = new FormData();
        formData.append('audio_file', audioBlob, 'recording.webm');

        if (selectedAudioModel) {
            if (selectedAudioModel.includes('|')) {
                const [modelName, mode] = selectedAudioModel.split('|');
                formData.append('model', modelName);
                formData.append('mode', mode);
            } else {
                formData.append('model', selectedAudioModel);
                formData.append('mode', 'transcribe');
            }
        }

        const abortController = new AbortController();
        abortControllersRef.current[id] = abortController;

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

            setRecordings(prev => prev.map(r => r.id === id ? { ...r, transcription: transcriptionText, isTranscribing: false } : r));
        } catch (error) {
            if (error.name === 'AbortError') {
                console.info("Transcription was cancelled by the user.");
            } else {
                console.error('Transcription error:', error);
                setRecordings(prev => prev.map(r => r.id === id ? { ...r, error: error.message || "Transcription failed.", isTranscribing: false } : r));
            }
        } finally {
            delete abortControllersRef.current[id];
        }
    }, [transcriptionUrl, selectedAudioModel]);

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
                setIsRecording(true);
                elapsedTimeRef.current = 0;
                setElapsedTime(0);
                setIsNearingTimeLimit(false);
                timerIntervalRef.current = setInterval(() => {
                    elapsedTimeRef.current += 1;
                    setElapsedTime(elapsedTimeRef.current);
                }, 1000);

                autoStopTimerRef.current = setTimeout(() => {
                    console.log("Recording time limit reached. Stopping automatically.");
                    stopRecording();
                }, MAX_RECORDING_SECONDS * 1000);
            };
            recorder.onstop = () => {
                const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                const url = URL.createObjectURL(blob);
                const id = `rec-${Date.now()}`;
                const duration = elapsedTimeRef.current;
                const newRecording = { id, blob, url, duration, transcription: '', isTranscribing: false, error: null };
                setRecordings(prev => [...prev, newRecording]);
                transcribeAudioBlob(id, blob);
            };
            recorder.start();
        } catch (err) {
            console.error("Microphone access error:", err);
            alert("Could not access the microphone. Please check your browser permissions.");
        }
    }, [transcribeAudioBlob, stopRecording]);

    const cancelTranscription = useCallback((id) => {
        if (abortControllersRef.current[id]) {
            abortControllersRef.current[id].abort();
        }
    }, []);

    const retryTranscription = useCallback((id) => {
        const rec = recordings.find(r => r.id === id);
        if (rec) transcribeAudioBlob(id, rec.blob);
    }, [recordings, transcribeAudioBlob]);

    const removeRecording = useCallback((id) => {
        cancelTranscription(id);
        setRecordings(prev => prev.filter(r => r.id !== id));
        const el = document.getElementById(`capsule-${id}`);
        if (el) el.remove();
    }, [cancelTranscription]);

    useEffect(() => {
        if (isRecording && elapsedTime >= WARNING_THRESHOLD_SECONDS) {
            if (!isNearingTimeLimit) setIsNearingTimeLimit(true);
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
        Object.values(abortControllersRef.current).forEach(c => c.abort());
    }, []);

    return {
        isRecording,
        elapsedTime,
        recordings,
        startRecording,
        stopRecording,
        cancelTranscription,
        retryTranscription,
        removeRecording,
        isNearingTimeLimit,
    };
};
import { useState, useRef } from 'react';
import { Mic } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

export const VoiceAssistant = () => {
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder.current = new MediaRecorder(stream);
      audioChunks.current = [];

      mediaRecorder.current.ondataavailable = (event) => {
        audioChunks.current.push(event.data);
      };

      mediaRecorder.current.onstop = async () => {
        const audioBlob = new Blob(audioChunks.current, { type: 'audio/wav' });
        const reader = new FileReader();
        
        reader.onload = async () => {
          if (!reader.result) {
            toast.error('Failed to process audio');
            return;
          }

          const base64Audio = reader.result.toString().split(',')[1];
          
          try {
            setIsProcessing(true);
            toast.info('Processing your request...');

            const { data, error } = await supabase.functions.invoke('process-voice', {
              body: { audioData: base64Audio }
            });

            if (error) {
              console.error('Supabase function error:', error);
              toast.error('Failed to process voice input');
              return;
            }

            if (!data?.audio) {
              toast.error('No audio response received');
              return;
            }

            // Play audio response
            const audioArray = new Uint8Array(data.audio);
            const audioBlob = new Blob([audioArray], { type: 'audio/mp3' });
            const audioUrl = URL.createObjectURL(audioBlob);
            const audio = new Audio(audioUrl);
            
            audio.onended = () => {
              URL.revokeObjectURL(audioUrl);
            };

            await audio.play();
            toast.success('Response received!');
          } catch (error) {
            console.error('Error processing voice:', error);
            toast.error('Error processing voice input');
          } finally {
            setIsProcessing(false);
            setIsListening(false);
          }
        };

        reader.readAsDataURL(audioBlob);
      };

      mediaRecorder.current.start();
      setIsListening(true);
      toast.info('Listening...');
    } catch (error) {
      console.error('Error accessing microphone:', error);
      toast.error('Error accessing microphone');
    }
  };

  const stopRecording = () => {
    if (mediaRecorder.current && mediaRecorder.current.state !== 'inactive') {
      mediaRecorder.current.stop();
      mediaRecorder.current.stream.getTracks().forEach(track => track.stop());
    }
  };

  const handleVoiceClick = async () => {
    if (isProcessing) return;

    if (!isListening) {
      await startRecording();
    } else {
      stopRecording();
    }
  };

  return (
    <div className="relative">
      <button
        onClick={handleVoiceClick}
        className={`relative w-32 h-32 rounded-full flex items-center justify-center transition-all 
          ${isListening ? 'bg-restaurant-primary' : 'bg-restaurant-light hover:bg-restaurant-accent'}`}
        disabled={isProcessing}
      >
        <Mic className={`w-12 h-12 ${isListening ? 'text-white animate-pulse' : 'text-restaurant-dark'}`} />
        
        {isListening && (
          <>
            <div className="absolute w-full h-full rounded-full bg-restaurant-primary opacity-75 animate-wave" />
            <div className="absolute w-full h-full rounded-full bg-restaurant-primary opacity-50 animate-wave" style={{ animationDelay: '0.5s' }} />
          </>
        )}
      </button>

      <div className="mt-4 text-center">
        <p className="text-restaurant-dark font-medium">
          {isProcessing ? "Processing..." : isListening ? "Listening..." : "Click to speak"}
        </p>
      </div>
    </div>
  );
};
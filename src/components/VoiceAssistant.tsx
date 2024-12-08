import { useState } from 'react';
import { Mic, MicOff } from 'lucide-react';
import { toast } from 'sonner';

export const VoiceAssistant = () => {
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleVoiceClick = async () => {
    if (isProcessing) return;

    try {
      setIsListening(!isListening);
      // This is where we'll integrate with Supabase for voice processing
      toast.info(isListening ? "Stopped listening" : "Listening...");
    } catch (error) {
      toast.error("Error accessing microphone");
      setIsListening(false);
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
        {isListening ? (
          <Mic className="w-12 h-12 text-white animate-pulse" />
        ) : (
          <Mic className="w-12 h-12 text-restaurant-dark" />
        )}
        
        {/* Ripple effect when listening */}
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
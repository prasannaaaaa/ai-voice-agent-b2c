import { VoiceAssistant } from "@/components/VoiceAssistant";

const Index = () => {
  return (
    <div className="min-h-screen bg-restaurant-secondary flex flex-col items-center justify-center p-4">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-restaurant-dark mb-2">AI Restaurant Assistant</h1>
        <p className="text-lg text-gray-600">Click the microphone to start speaking</p>
      </div>
      
      <div className="bg-white p-8 rounded-2xl shadow-lg">
        <VoiceAssistant />
      </div>
      
      <div className="mt-8 text-sm text-gray-500 max-w-md text-center">
        <p>I can help you with restaurant bookings, menu information, and placing orders.</p>
      </div>
    </div>
  );
};

export default Index;
const API = {
    /**
     * Start the simulation by calling the backend API.
     * @returns {Promise<string>} - The simulation prompt returned by the backend.
     */
    async startSimulation() {
        try {
            const response = await fetch("/start-simulation", { method: "POST" });
            if (!response.ok) {
                throw new Error(`API error: ${response.statusText}`);
            }
            const data = await response.json();
            return data.prompt;
        } catch (error) {
            console.error("Error in startSimulation API call:", error);
            throw error;
        }
    },

    /**
     * Reset the simulation by calling the backend API.
     * @returns {Promise<void>} - Resolves when the reset is successful.
     */
    async resetSimulation() {
        try {
            const response = await fetch("/reset-simulation", { method: "POST" });
            if (!response.ok) {
                throw new Error(`API error: ${response.statusText}`);
            }
            const data = await response.json();
            console.log(data.message); // Log success message for debugging
        } catch (error) {
            console.error("Error in resetSimulation API call:", error);
            throw error;
        }
    },

    /**
     * Upload an audio file to the backend for transcription.
     * @param {Blob} audioBlob - The audio file to upload.
     * @returns {Promise<string>} - The transcription of the uploaded audio.
     */
    async uploadAudio(audioBlob) {
        try {
            const formData = new FormData();
            formData.append("file", audioBlob, "recording.webm");

            const response = await fetch("/record-audio", {
                method: "POST",
                body: formData,
            });

            if (!response.ok) {
                throw new Error(`API error: ${response.statusText}`);
            }

            const data = await response.json();
            return data.transcription;
        } catch (error) {
            console.error("Error in uploadAudio API call:", error);
            throw error;
        }
    }
};

export default API;
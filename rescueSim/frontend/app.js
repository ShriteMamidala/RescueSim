import API from "./api.js";

document.addEventListener("DOMContentLoaded", () => {
    const endSimulationButton = document.getElementById("end-simulation-button");
    const startSimulationButton = document.getElementById("start-simulation");
    const simulationOptions = document.getElementById("simulation-options");
    const textToTextButton = document.getElementById("text-to-text");
    const speechToSpeechButton = document.getElementById("speech-to-speech");
    const mainTextbox = document.getElementById("main-textbox");
    const userInput = document.getElementById("user-input");
    const recordAudioButton = document.getElementById("record-audio");
    const listenToCallerButton = document.getElementById("listen-to-caller");

    let mediaRecorder = null;
    let audioChunks = [];
    let isRecording = false; // Tracks recording state

    const startFeedbackButton = document.getElementById("start-feedback");

    // Navigate to Feedback Page
    if (startFeedbackButton) {
        startFeedbackButton.addEventListener("click", () => {
            window.location.href = "feedback.html"; // Redirect to feedback.html
        });
    }

    function appendMessage(role, message) {
        const newMessage = `${role}: ${message}`;
        const conversationLog = localStorage.getItem("conversationLog") || ""; // Get existing log or empty string
        const updatedLog = `${conversationLog}${newMessage}\n`; // Append new message with newline
        localStorage.setItem("conversationLog", updatedLog); // Save updated log back to localStorage
    
        // Update the UI
        const newMessageElement = document.createElement("p");
        newMessageElement.textContent = newMessage;
        mainTextbox.appendChild(newMessageElement);
        mainTextbox.scrollTop = mainTextbox.scrollHeight; // Auto-scroll to the latest message
    }

    // Event listener for Enter key in the input box (Text-to-Text Mode)
    userInput?.addEventListener("keydown", async (event) => {
        if (event.key === "Enter") {
            const dispatcherMessage = userInput.value.trim();
            if (!dispatcherMessage) return; // Skip if input is empty

            // Step 1: Append the dispatcher's message to the textbox
            appendMessage("Dispatcher", dispatcherMessage);

            // Step 2: Clear the input field
            userInput.value = "";

            // Step 3: Send the message to the backend and get victim response
            try {
                const victimResponse = await API.sendDispatcherMessage(dispatcherMessage); // Use API module

                // Step 4: Append the victim's response to the textbox
                appendMessage("Victim", victimResponse);
            } catch (error) {
                console.error("Error processing text-to-text interaction:", error);
                alert("Failed to process your message. Please try again.");
            }
        }
    });

    // End Simulation Button
    if (endSimulationButton) {
        endSimulationButton.addEventListener("click", async () => {
            try {
                await API.resetSimulation(); // Call API to reset simulation
                window.location.href = "index.html"; // Redirect to the main page
            } catch (error) {
                console.error("Failed to reset simulation:", error);
            }
        });
    }

    // Simulation Start Buttons
    if (startSimulationButton && simulationOptions) {
        startSimulationButton.addEventListener("click", () => {
            simulationOptions.classList.toggle("hidden");
        });
    }

    // Navigate and Start Simulation
    async function startSimulationAndNavigate(mode) {
        try {
            const prompt = await API.startSimulation(); // Fetch scenario prompt from API
            const formattedPrompt = `Scenario: ${prompt}`; // Add 'Scenario:' prefix
            localStorage.setItem("simulationPrompt", formattedPrompt); // Save formatted prompt in localStorage
            if (mode === "text") {
                window.location.href = "text-to-text.html";
            } else if (mode === "speech") {
                window.location.href = "speech-to-speech.html";
            }
        } catch (error) {
            console.error("Error starting simulation:", error);
        }
    }

    if (textToTextButton) {
        textToTextButton.addEventListener("click", () => startSimulationAndNavigate("text"));
    }

    if (speechToSpeechButton) {
        speechToSpeechButton.addEventListener("click", () => startSimulationAndNavigate("speech"));
    }

    // Populate Main Textbox
    function populateMainTextbox() {
        const prompt = localStorage.getItem("simulationPrompt");
        if (mainTextbox && prompt) {
            if (mainTextbox.tagName === "TEXTAREA") {
                mainTextbox.value = prompt; // For Speech-to-Speech Mode
            } else {
                mainTextbox.textContent = prompt; // For Text-to-Text Mode
            }
        }
    }

    // Check if current page is simulation_feedback.html and call the feedback function
    if (window.location.pathname.endsWith("simulation_feedback.html")) {
        handleFeedbackPage(); // Call the async function for feedback
    }

    // Define the async function to handle feedback logic
    async function handleFeedbackPage() {
        console.log("Simulation Feedback page detected. Fetching feedback...");
    
        try {
            // Fetch feedback and conversation log from the backend
            const response = await API.fetchFeedback();
    
            // Destructure response data
            const { feedback, conversation_log: conversationLog } = response;
    
            // Log feedback and conversation log for debugging
            console.log("Feedback from backend:", feedback);
            console.log("Conversation Log from backend:", conversationLog);
    
            // Combine conversation log and feedback
            const combinedFeedback = `--- Conversation Log ---\n${conversationLog}\n\n--- Feedback ---\n${feedback.feedback}`;
    
            // Populate the feedback fields
            document.getElementById("overall-performance").value = `${feedback.rating}/10 - ${feedback.review}`;
            document.getElementById("detailed-feedback").value = combinedFeedback;
    
        } catch (error) {
            console.error("Error fetching feedback:", error);
        }
    }

    // Start Recording Function
    async function startRecording() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mimeType = MediaRecorder.isTypeSupported("audio/webm")
                ? "audio/webm"
                : ""; // Fallback to default

            mediaRecorder = new MediaRecorder(stream, { mimeType });

            audioChunks = []; // Reset audio chunks

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunks.push(event.data);
                }
            };

            mediaRecorder.onstop = async () => {
                const audioBlob = new Blob(audioChunks, { type: "audio/webm" });
                console.log("Recorded Blob Type:", audioBlob.type); // Should log "audio/webm"
                try {
                    const transcription = await API.uploadAudio(audioBlob); // Upload audio as WebM
                    displayTranscription(transcription); // Display transcription in the textbox
                } catch (error) {
                    console.error("Error uploading audio:", error);
                }

                // Toggle buttons after recording ends
                recordAudioButton.classList.add("hidden");
                listenToCallerButton.classList.remove("hidden");
            };

            mediaRecorder.start();
            console.log("Recording started...");
        } catch (error) {
            console.error("Error starting recording:", error);
        }
    }

    // Stop Recording Function
    function stopRecording() {
        if (mediaRecorder && mediaRecorder.state === "recording") {
            mediaRecorder.stop();
            console.log("Recording stopped...");
        }
    }

    // Display Transcription on UI
    function displayTranscription(transcription) {
        if (mainTextbox) {
            // Add a newline only if there is already content in the textbox
            const separator = mainTextbox.value.trim() !== "" ? "\n\n" : "";
            mainTextbox.value += `${separator}Dispatcher: ${transcription}`;
            mainTextbox.scrollTop = mainTextbox.scrollHeight; // Scroll to the latest entry
        }
        console.log("Transcription added to main textbox:", transcription);
    }

    // Record Audio Button Logic
    if (recordAudioButton) {
        recordAudioButton.addEventListener("click", () => {
            if (!isRecording) {
                startRecording();
                recordAudioButton.textContent = "Stop Recording";
            } else {
                stopRecording();
                recordAudioButton.textContent = "Record Audio";
            }
            isRecording = !isRecording;
        });
    }

    // Speech-to-Speech Button Logic: Listen to Caller
    if (listenToCallerButton) {
        listenToCallerButton.addEventListener("click", async () => {
            // Hide "Listen to Caller" and show "Record Audio"
            listenToCallerButton.classList.add("hidden");
            recordAudioButton.classList.remove("hidden");

            try {
                // Fetch GPT response and audio from the backend
                const { text, audio_url } = await API.listenToCaller();

                // Append the GPT response to the main textbox
                if (mainTextbox) {
                    mainTextbox.value += `\n\nVictim: ${text}`; // Add victim response with spacing
                    mainTextbox.scrollTop = mainTextbox.scrollHeight; // Auto-scroll to latest entry
                }

                // Play the audio file
                const audio = new Audio(audio_url);
                audio.play();
            } catch (error) {
                console.error("Error handling 'Listen to Caller':", error);
                alert("Failed to retrieve the victim's response. Please try again.");

                // Revert button visibility on error
                listenToCallerButton.classList.remove("hidden");
                recordAudioButton.classList.add("hidden");
            }
        });
    }

    // Populate the textbox with the simulation prompt
    if (mainTextbox) {
        populateMainTextbox();
    }


    const backButton = document.getElementById("simulation-feedback-back-button");

    if (backButton) {
        backButton.addEventListener("click", async (event) => {
            event.preventDefault(); // Prevent default navigation behavior
            try {
                console.log("Back button clicked. Clearing conversation log...");

                // Call API to reset simulation and clear log
                await API.resetSimulation();

                // Clear localStorage for conversation log
                localStorage.removeItem("conversationLog");

                // Redirect to the index page
                window.location.href = "index.html";
            } catch (error) {
                console.error("Failed to clear conversation log:", error);
            }
        });
    }


    const audioUploadInput = document.getElementById("audio-upload");
    const conversationTextarea = document.querySelector(".container .box:nth-child(1) textarea");
    const feedbackTextarea = document.querySelector(".container .box:nth-child(2) textarea");
    
    if (audioUploadInput) {
        audioUploadInput.addEventListener("change", async (event) => {
            const file = event.target.files[0];
            console.log("File selected:", file); // Debug log
    
            if (!file) {
                alert("Please select a valid audio file.");
                return;
            }
    
            // Validate file type
            const validTypes = ["audio/mpeg", "audio/wav", "audio/flac", "audio/ogg", "audio/mp4"];
            if (!validTypes.includes(file.type)) {
                alert("Unsupported file format. Please upload a valid file.");
                return;
            }
    
            console.log("File type validated:", file.type); // Debug log
    
            try {
                const { conversation_log, feedback } = await API.processAudio(file);
                console.log("Response received:", { conversation_log, feedback }); // Debug log
    
                conversationTextarea.value = conversation_log || "No conversation log generated.";
                feedbackTextarea.value = feedback || "No feedback generated.";
            } catch (error) {
                console.error("Error processing audio file:", error);
            }
        });
    }

    const textUploadInput = document.getElementById("text-upload");
    const conversationLogTextarea = document.getElementById("conversation-log");
    const detailedFeedbackTextarea = document.getElementById("detailed-feedback");

    // Event listener for text file upload
    textUploadInput.addEventListener("change", async (event) => {
        const file = event.target.files[0];
        if (!file) {
            alert("Please select a text file.");
            return;
        }

        const formData = new FormData();
        formData.append("file", file);

        try {
            // Call the API to process the text file
            const response = await fetch("/process-text-file", {
                method: "POST",
                body: formData,
            });

            if (!response.ok) {
                throw new Error(`Error: ${response.statusText}`);
            }

            const data = await response.json();

            // Populate the conversation log textarea
            conversationLogTextarea.value = data.conversation_log;

            // Populate the feedback textarea
            detailedFeedbackTextarea.value = data.feedback;
        } catch (error) {
            console.error("Error uploading text file:", error);
            alert("Failed to process the text file. Please try again.");
        }
    });
    

});

import speech_recognition as sr

def listen_and_convert():
    recognizer = sr.Recognizer()
    mic = sr.Microphone()

    with mic as source:
        print("🎤 Adjusting for background noise... please wait")
        recognizer.adjust_for_ambient_noise(source)

        print("✅ Ready! Start speaking...")
        audio = recognizer.listen(source)

    try:
        print("📝 Recognizing...")
        text = recognizer.recognize_google(audio)  # Uses Google Speech API
        print("You said:", text)
        return text
    except sr.UnknownValueError:
        print("❌ Sorry, could not understand audio")
    except sr.RequestError as e:
        print(f"⚠️ Could not request results; {e}")

if __name__ == "__main__":
    listen_and_convert()

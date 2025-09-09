import time
from plyer import notification

def send_notification(title, message):
    notification.notify(
        title=title,
        message=message,
        timeout=5   # seconds
    )

if __name__ == "__main__":
    send_notification("DigiGov", "Reminder: Check new schemes today!")
    time.sleep(2)
    send_notification("DigiGov", "Don’t forget to send your child to school 📚")

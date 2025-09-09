import requests

def get_location():
    """
    Get approximate location (latitude and longitude) using IP-based geolocation.
    Returns:
        tuple: (latitude, longitude) or None if location cannot be determined.
    """
    try:
        response = requests.get("https://ipinfo.io")
        response.raise_for_status()  # Raises an error for bad HTTP status codes
        data = response.json()
        if "loc" in data:
            lat, lon = map(float, data["loc"].split(","))
            return lat, lon
        else:
            print("Location information not available in response.")
            return None
    except requests.RequestException as e:
        print("Error fetching location:", e)
        return None

# Get the coordinates
coords = get_location()
if coords:
    print(f"Approximate Latitude: {coords[0]}")
    print(f"Approximate Longitude: {coords[1]}")
else:
    print("Could not determine location.")

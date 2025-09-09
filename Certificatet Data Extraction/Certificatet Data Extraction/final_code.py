from azure.core.credentials import AzureKeyCredential
from azure.ai.formrecognizer import DocumentAnalysisClient
from azure.core.exceptions import HttpResponseError
import os
from dotenv import load_dotenv
import google.generativeai as genai
import pandas as pd


# ---------------------- Azure Document Analysis ---------------------- #
def analyze_general_documents():
    path_to_sample_documents = os.path.abspath(
        r"C:\Users\HP\OneDrive\Desktop\DigiGov\Certificatet Data Extraction\Certificatet Data Extraction\10th_long_memo.pdf"
    )

    endpoint = "https://form-recognition-project.cognitiveservices.azure.com/"
    key = "59268cc137cf4ae891e344c114ac7eeb"

    document_analysis_client = DocumentAnalysisClient(
        endpoint=endpoint, credential=AzureKeyCredential(key)
    )
    with open(path_to_sample_documents, "rb") as f:
        poller = document_analysis_client.begin_analyze_document(
            "prebuilt-document", document=f
        )
    result = poller.result()

    # Initialize multi-line string to store all data
    output = ""

    # Extract key-value pairs
    output += "----Key-value pairs found in document----\n"
    for kv_pair in result.key_value_pairs:
        if kv_pair.key:
            output += f"'{kv_pair.key.content}': '{kv_pair.value.content if kv_pair.value else None}'\n"

    # Extract tables
    output += "\n----Tables found in document----\n"
    for table_idx, table in enumerate(result.tables):
        output += f"Table: {table_idx + 1}\n"
        output += f"Row Count: {table.row_count}, Column Count: {table.column_count}\n"
        output += "Cells:\n"
        for cell in table.cells:
            output += f"Row Index: {cell.row_index}, Column Index: {cell.column_index}, Content: {cell.content}\n"
        output += "----------------------------------------\n"

    return output


# ---------------------- Gemini Setup ---------------------- #
# Load environment variables
load_dotenv()

# Configure Google Generative AI
genai.configure(api_key="AIzaSyCDGhmT6kSuZxqj1Di35UspQ8wFHVIhF2I")


def get_gemini_response(question):
    model = genai.GenerativeModel("gemini-pro")
    chat = model.start_chat(history=[])
    response = chat.send_message(question, stream=True)
    return response


# ---------------------- Main Script ---------------------- #
if __name__ == "__main__":
    try:
        document_data = analyze_general_documents()
    except HttpResponseError as error:
        print(
            "For more information about troubleshooting errors, see: "
            "https://aka.ms/azsdk/python/formrecognizer/troubleshooting"
        )
        if error.error is not None:
            if error.error.code == "InvalidImage":
                print(f"Received an invalid image error: {error.error}")
            if error.error.code == "InvalidRequest":
                print(f"Received an invalid request error: {error.error}")
            raise
        if "Invalid request".casefold() in error.message.casefold():
            print(f"Uh-oh! Seems there was an invalid request: {error}")
        raise

    # ---------------------- Queries to Gemini ---------------------- #
    queries = {
        "Name": "Tell me the name of the person only without any extra words to whom the details are reffering to? If not found give output as NULL only",
        "Father Name": "Tell me the father name of the person only without any extra words to whom the details are reffering to? If not found give output as NULL only",
        "Mother Name": "Tell me the mother name of the person only without any extra words to whom the details are reffering to? If not found give output as NULL only",
        "CGPA": "Tell me the only CGPA of the person without any extra words to whom the details are reffering to? If not found give output as NULL only",
    }

    extracted_data = {}

    for field, query in queries.items():
        response = get_gemini_response(query + document_data)
        chunks = [chunk.text for chunk in response]
        extracted_data[field] = "".join(chunks).strip()
        print(f"{field}: {extracted_data[field]}")

    # ---------------------- Save to CSV ---------------------- #
    try:
        df = pd.read_csv("Data.csv")
    except FileNotFoundError:
        df = pd.DataFrame(columns=["Name", "Father Name", "Mother Name", "CGPA"])

    new_data = pd.DataFrame([extracted_data])
    df = pd.concat([df, new_data], ignore_index=True)
    df.to_csv("Data.csv", index=False)
    print("Data saved to Data.csv successfully.")

import google.generativeai as genai
import os
import sys
from dotenv import load_dotenv

# Load from environment variables
load_dotenv()

# Also try loading specifically from backend/.env if it exists
backend_env = os.path.join(os.path.dirname(__file__), "backend", ".env")
if os.path.exists(backend_env):
    load_dotenv(backend_env)

api_key = os.getenv("GEMINI_API_KEY")

if not api_key:
    print("[WARNING] GEMINI_API_KEY environment variable not found.")
    print("Please set the GEMINI_API_KEY environment variable or create a 'backend/.env' file containing:")
    print("GEMINI_API_KEY=your-api-key-here\n")
    sys.exit(1)

# Configure Gemini
genai.configure(api_key=api_key)

print("Checking available models for your API key...")
try:
    models_found = []
    for m in genai.list_models():
        # We only care about models that can generate content
        if 'generateContent' in m.supported_generation_methods:
            models_found.append(m.name)
            print(f"[OK] Available: {m.name}")
    
    if not models_found:
        print("[WARNING] No text generation models found on your API key.")
except Exception as e:
    error_msg = str(e).split('\n')[0]
    print(f"[ERROR] Error listing models: {error_msg}")
    print("Ensure your API key is correct and active.")
    sys.exit(1)

# The models from your list that are most likely to have a Free Tier
candidates = [
    "gemini-2.0-flash-lite",       # 1. Best bet (New standard lite)
    "gemini-2.0-flash-lite-001",   # 2. Specific version
    "gemini-flash-lite-latest",    # 3. Alias for the current lite model
    "gemini-2.0-flash",            # 4. Standard Flash (might be paid, but worth a check)
    "gemini-1.5-flash-latest"      # 5. Old faithful fallback
]

print(f"\n[INFO] Testing {len(candidates)} models for Free Tier access...\n")

success_model = None

for model_name in candidates:
    print(f"Testing {model_name}...", end=" ", flush=True)
    try:
        model = genai.GenerativeModel(model_name)
        response = model.generate_content("Reply with the single word: Success")
        
        # If we get here, it worked!
        print("[SUCCESS]")
        print(f"   Response: {response.text.strip()}")
        success_model = model_name
        break # Stop testing, we found one!
        
    except Exception as e:
        print("[FAILED]")
        error_msg = str(e).split('\n')[0] # Keep it clean
        print(f"   Error: {error_msg}\n")

print("-" * 40)
if success_model:
    print(f"[SUCCESS] Use this model in your configuration: '{success_model}'")
else:
    print("[WARNING] All tested models failed. Ensure your billing is active or check if the API key has permission for Gemini models.")
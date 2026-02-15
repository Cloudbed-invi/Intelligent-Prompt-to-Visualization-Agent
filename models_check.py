import google.generativeai as genai

# Make sure your API key is set
genai.configure(api_key="AIzaSyCfCIrIWdM8EelbGmTb5XhFzx75yhJsuwk")

print("Checking available models for your API key...")
try:
    for m in genai.list_models():
        # We only care about models that can generate content
        if 'generateContent' in m.supported_generation_methods:
            print(f"✅ Available: {m.name}")
except Exception as e:
    print(f"Error listing models: {e}")

import google.generativeai as genai
import os

# --- SETUP ---
# Replace with your actual key or ensure it's in your environment variables
api_key = "AIzaSyCfCIrIWdM8EelbGmTb5XhFzx75yhJsuwk" 
genai.configure(api_key=api_key)

# The models from your list that are most likely to have a Free Tier
candidates = [
    "gemini-2.0-flash-lite",       # 1. Best bet (New standard lite)
    "gemini-2.0-flash-lite-001",   # 2. Specific version
    "gemini-flash-lite-latest",    # 3. Alias for the current lite model
    "gemini-2.0-flash",            # 4. Standard Flash (might be paid, but worth a check)
    "gemini-1.5-flash-latest"      # 5. Old faithful fallback
]

print(f"🚀 Testing {len(candidates)} models for Free Tier access...\n")

success_model = None

for model_name in candidates:
    print(f"Testing: {model_name}...", end=" ")
    try:
        model = genai.GenerativeModel(model_name)
        response = model.generate_content("Reply with the single word: Success")
        
        # If we get here, it worked!
        print("✅ WORKING!")
        print(f"   Response: {response.text.strip()}")
        success_model = model_name
        break # Stop testing, we found one!
        
    except Exception as e:
        print("❌ FAILED")
        # Print a short error to see if it's 429 (Quota) or 404 (Not Found)
        error_msg = str(e).split('\n')[0] # Keep it clean
        print(f"   Error: {error_msg}\n")

print("-" * 30)
if success_model:
    print(f"🎉 USE THIS MODEL IN YOUR CODE: '{success_model}'")
else:
    print("⚠️ All tested models failed. You likely need to add a Billing Account (Credit Card) to unlock the Free Tier.")
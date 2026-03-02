import os
import sys
import json
import argparse
from dotenv import load_dotenv
from typing import Dict, Any

# Add src to path
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from src.ai_interface import ProviderFactory
from src.tools import WebScraper, PDFRenderer, JSONParser
from src.prompts import (
    SYSTEM_PROMPT_JOB_ANALYZER,
    SYSTEM_PROMPT_CV_GENERATOR,
    SYSTEM_PROMPT_COVER_LETTER_GENERATOR,
    SYSTEM_PROMPT_EMAIL_GENERATOR
)

def load_file(path: str) -> str:
    with open(path, 'r', encoding='utf-8') as f:
        return f.read()

def save_file(path: str, content: str):
    """Save content to file with UTF-8 encoding, handling encoding issues."""
    try:
        with open(path, 'w', encoding='utf-8') as f:
            f.write(content)
    except UnicodeEncodeError:
        # If UTF-8 encoding fails, try to fix the content
        print(f"Warning: Encoding issue detected in {path}, attempting to fix...")
        fixed_content = content.encode('utf-8', errors='replace').decode('utf-8')
        with open(path, 'w', encoding='utf-8') as f:
            f.write(fixed_content)

def load_config(config_path: str = None) -> dict:
    """Load configuration from JSON file."""
    default_config = {
        "generate_cv": True,
        "generate_cover_letter": True,
        "generate_email": True,
        "output_dir": "output",
        "profile_path": "data/candidate_profile.md",
        "templates": {
            "cv": "templates/cv_template.tex",
            "cover_letter": "templates/cover_letter_template.tex"
        }
    }
    
    if not config_path or not os.path.exists(config_path):
        if config_path == "config.json":
            print(f"Info: No config.json found, using default configuration")
        return default_config
    
    try:
        with open(config_path, 'r', encoding='utf-8') as f:
            user_config = json.load(f)
        
        # Merge user config with defaults (user config takes precedence)
        merged_config = default_config.copy()
        merged_config.update(user_config)
        return merged_config
    except (json.JSONDecodeError, IOError) as e:
        print(f"Warning: Could not load config file: {e}")
        return default_config


def clean_utf8_content(content: str) -> str:
    """Ensure content is valid UTF-8 by replacing invalid characters."""
    try:
        # Try to encode to UTF-8 to check for invalid characters
        content.encode('utf-8')
        return content
    except UnicodeEncodeError:
        # Replace invalid UTF-8 sequences with replacement character
        return content.encode('utf-8', errors='replace').decode('utf-8')


def extract_clean_latex(ai_response: str) -> str:
    """
    Extracts clean LaTeX code from AI response.
    Handles cases where AI might include explanations or markdown formatting.
    """
    # First clean up any UTF-8 issues
    ai_response = clean_utf8_content(ai_response)
    # If response already looks like clean LaTeX, return as-is
    if ai_response.strip().startswith('\\documentclass') and ai_response.strip().endswith('\\end{document}'):
        return ai_response.strip()
    
    # Try to extract LaTeX from code blocks (```latex ... ```)
    import re
    latex_match = re.search(r'```latex\s*(.*?)\s*```', ai_response, re.DOTALL)
    if latex_match:
        return latex_match.group(1).strip()
    
    # Try to extract LaTeX from generic code blocks (``` ... ```)
    code_match = re.search(r'```\s*(.*?)\s*```', ai_response, re.DOTALL)
    if code_match:
        return code_match.group(1).strip()
    
    # If no code blocks found, try to find LaTeX document structure
    doc_match = re.search(r'\\documentclass.*?\\end{document}', ai_response, re.DOTALL)
    if doc_match:
        return doc_match.group(0).strip()
    
    # Fallback: return the original response (might fail compilation)
    return ai_response.strip()

def ensure_latex_encoding(latex_content: str) -> str:
    """
    Ensures LaTeX document has proper UTF-8 encoding and font support.
    Adds necessary packages if missing.
    """
    # First ensure the content is valid UTF-8
    latex_content = clean_utf8_content(latex_content)
    
    # Check if UTF-8 inputenc is already present
    if r'\usepackage[utf8]{inputenc}' not in latex_content and r'\usepackage[utf8x]{inputenc}' not in latex_content:
        # Find the document class line and insert inputenc after it
        lines = latex_content.split('\n')
        for i, line in enumerate(lines):
            if line.strip().startswith('\\documentclass'):
                # Insert inputenc after documentclass
                lines.insert(i+1, r'\usepackage[utf8]{inputenc}')
                latex_content = '\n'.join(lines)
                break
    
    # Ensure T1 font encoding for better character support
    if r'\usepackage[T1]{fontenc}' not in latex_content:
        lines = latex_content.split('\n')
        for i, line in enumerate(lines):
            if line.strip().startswith('\\usepackage[utf8]') or line.strip().startswith('\\usepackage[utf8x]'):
                lines.insert(i+1, r'\usepackage[T1]{fontenc}')
                latex_content = '\n'.join(lines)
                break
        else:
            # If we didn't find utf8 package, add fontenc after documentclass
            lines = latex_content.split('\n')
            for i, line in enumerate(lines):
                if line.strip().startswith('\\documentclass'):
                    lines.insert(i+1, r'\usepackage[T1]{fontenc}')
                    latex_content = '\n'.join(lines)
                    break
    
    return latex_content

def fill_template(template: str, data: Dict[str, Any]) -> str:
    """Replaces <<key>> in template with value from data."""
    for key, value in data.items():
        placeholder = f"<<{key}>>"
        if isinstance(value, list):
            # Handle lists specifically for LaTeX sections if needed, 
            # but for now assume the AI generates the full LaTeX section string 
            # or we join them.
            # If the key ends with _section, we expect a string.
            # If it's a list, we might need to format it.
            # For this MVP, let's assume the AI returns formatted strings for sections
            # OR we do simple joining.
            pass
        
        if value is not None:
             template = template.replace(placeholder, str(value))
    return template

def format_experience(experience_list: list) -> str:
    """Formats experience list into LaTeX commands."""
    latex_str = ""
    for exp in experience_list:
        latex_str += f"\\cventry{{{exp.get('dates', '')}}}{{{exp.get('role', '')}}}{{{exp.get('company', '')}}}{{}}{{}}{{\n"
        latex_str += "\\begin{itemize}\n"
        for detail in exp.get('details', []):
            latex_str += f"\\item {detail}\n"
        latex_str += "\\end{itemize}}\n"
    return latex_str

def format_education(education_list: list) -> str:
    latex_str = ""
    for edu in education_list:
        # Assuming simple string or dict. If dict, adapt.
        # Let's assume the AI gives a string or simple dict.
        # If string:
        if isinstance(edu, str):
             latex_str += f"\\cvitem{{}}{{ {edu} }}\n"
        elif isinstance(edu, dict):
             latex_str += f"\\cventry{{{edu.get('dates', '')}}}{{{edu.get('degree', '')}}}{{{edu.get('institution', '')}}}{{}}{{}}{{}}\n"
    return latex_str

def format_skills(skills_list: list) -> str:
    # \cvitem{Category}{Skill1, Skill2}
    # Or just a comma separated list
    formatted_skills = []
    for skill in skills_list:
        if isinstance(skill, str):
            formatted_skills.append(skill)
        elif isinstance(skill, dict):
             # Try to find common keys
            name = skill.get('skill') or skill.get('name') or list(skill.values())[0]
            formatted_skills.append(str(name))
    return f"\\cvitem{{Skills}}{{ {', '.join(formatted_skills)} }}"

def format_languages(languages_list: list) -> str:
    formatted_languages = []
    for lang in languages_list:
        if isinstance(lang, str):
            formatted_languages.append(lang)
        elif isinstance(lang, dict):
            # Try to find common keys for language name and proficiency
            name = lang.get('language') or lang.get('name') or list(lang.values())[0]
            proficiency = lang.get('proficiency') or lang.get('level')
            if proficiency:
                formatted_languages.append(f"{name} ({proficiency})")
            else:
                formatted_languages.append(str(name))
    return f"\\cvitem{{Languages}}{{ {', '.join(formatted_languages)} }}"

def main():
    load_dotenv()
    
    parser = argparse.ArgumentParser(description="AutoCV Generator")
    parser.add_argument("url", help="URL of the job posting")
    parser.add_argument("--profile", help="Path to candidate profile (overrides config)")
    parser.add_argument("--message", help="Custom message to guide the agent")
    parser.add_argument("--provider", default="mistral", choices=["mistral", "openai", "anthropic", "xai", "deepseek", "huggingface", "local"], help="AI Provider to use")
    parser.add_argument("--model", help="Specific model name to use")
    parser.add_argument("--api-key", help="API Key for the provider (overrides env var)")
    parser.add_argument("--api-base", help="Base URL for the provider (useful for local/compatible providers)")
    parser.add_argument("--config", help="Path to JSON config file")
    parser.add_argument("--no-cv", action="store_true", help="Skip CV generation")
    parser.add_argument("--no-cover-letter", action="store_true", help="Skip cover letter generation")
    parser.add_argument("--no-email", action="store_true", help="Skip email generation")
    parser.add_argument("--output-dir", help="Output directory for generated files (overrides config)")
    
    args = parser.parse_args()
    
    # Load configuration - use 'config.json' as default if no --config specified
    config_path = args.config if args.config else "config.json"
    config = load_config(config_path)
    
    # Override config with command line arguments
    if args.profile:
        config["profile_path"] = args.profile
    if args.output_dir:
        config["output_dir"] = args.output_dir
    if args.no_cv:
        config["generate_cv"] = False
    if args.no_cover_letter:
        config["generate_cover_letter"] = False
    if args.no_email:
        config["generate_email"] = False

    # 1. Setup
    try:
        ai = ProviderFactory.get_provider(
            args.provider, 
            api_key=args.api_key,
            api_base=args.api_base,
            model_name=args.model
        )
    except (ValueError, ImportError) as e:
        print(f"Error initializing provider: {e}")
        return

    print(f"Fetching job from: {args.url}")
    job_text = WebScraper.get_page_content(args.url)
    if not job_text:
        print("Failed to fetch job content.")
        return

    candidate_profile = load_file(config["profile_path"])

    # 2. Analyze Job
    print("Analyzing job...")
    job_analysis_str = ai.generate_response(SYSTEM_PROMPT_JOB_ANALYZER, job_text)
    job_analysis = JSONParser.parse(job_analysis_str)
    print(f"Job Title: {job_analysis.get('job_title')}")
    print(f"Company: {job_analysis.get('company')}")
    print(f"Language: {job_analysis.get('language')}")

    # 3. Generate CV Content (conditional)
    if config["generate_cv"]:
        print("Generating CV content...")
        
        # Load the LaTeX template
        cv_template = load_file(config["templates"]["cv"])
    
    # Set latex language based on job analysis
    def get_babel_language(lang_code: str) -> str:
        """Maps job language code/name to Babel package option."""
        if not lang_code:
            return "english"
        
        lang_lower = lang_code.lower()
        if "de" in lang_lower or "german" in lang_lower or "deutsch" in lang_lower:
            return "ngerman"
        elif "en" in lang_lower or "english" in lang_lower:
            return "english"
        # Default to english if unknown
        return "english"

    babel_lang = get_babel_language(job_analysis.get('language'))
    
    # Create prompt with template, candidate profile, and job analysis
    cv_prompt = f"LaTeX Template:\n{cv_template}\n\n"
    cv_prompt += f"Candidate Profile:\n{candidate_profile}\n\n"
    cv_prompt += f"Job Analysis:\n{json.dumps(job_analysis)}\n"
    cv_prompt += f"Babel Language: {babel_lang}\n"
    if args.message:
        cv_prompt += f"\nUser Guidance:\n{args.message}\n"
    
    # AI generates complete LaTeX document
    cv_latex_raw = ai.generate_response(SYSTEM_PROMPT_CV_GENERATOR, cv_prompt)
    cv_latex = extract_clean_latex(cv_latex_raw)
    
    # Provide user feedback about AI generation
    if cv_latex_raw != cv_latex:
        print("AI generated response with additional text. Extracted clean LaTeX for compilation.")
    else:
        print("AI generated clean LaTeX document.")
    
    # Ensure proper LaTeX encoding for special characters
    cv_latex = ensure_latex_encoding(cv_latex)
    
    # Ensure output directory exists
    output_dir = config["output_dir"]
    os.makedirs(output_dir, exist_ok=True)
    
    cv_filename = "cv.tex"
    cv_path = os.path.join(output_dir, cv_filename)
    save_file(cv_path, cv_latex)

    # 4. Render CV
    print("Rendering CV...")
    if PDFRenderer.render_tex(cv_path, output_dir=output_dir):
        print(f"CV rendered successfully: {os.path.join(output_dir, 'cv.pdf')}")
    else:
        print("Failed to render CV.")

    # 5. Generate Cover Letter Content (conditional)
    if config["generate_cover_letter"]:
        print("Generating Cover Letter content...")
        
        # Load the LaTeX template
        cl_template = load_file(config["templates"]["cover_letter"])
    
    # Create prompt with template, candidate profile, job analysis, and CV LaTeX
    cl_prompt = f"LaTeX Template:\n{cl_template}\n\n"
    cl_prompt += f"Candidate Profile:\n{candidate_profile}\n\n"
    cl_prompt += f"Job Analysis:\n{json.dumps(job_analysis)}\n\n"
    cl_prompt += f"CV LaTeX Content:\n{cv_latex}\n"
    cl_prompt += f"Babel Language: {babel_lang}\n"
    if args.message:
        cl_prompt += f"\nUser Guidance:\n{args.message}\n"
    
    # AI generates complete LaTeX document
    cl_latex_raw = ai.generate_response(SYSTEM_PROMPT_COVER_LETTER_GENERATOR, cl_prompt)
    cl_latex = extract_clean_latex(cl_latex_raw)
    
    # Provide user feedback about AI generation
    if cl_latex_raw != cl_latex:
        print("AI generated response with additional text. Extracted clean LaTeX for compilation.")
    else:
        print("AI generated clean LaTeX document.")
    
    # Ensure proper LaTeX encoding for special characters
    cl_latex = ensure_latex_encoding(cl_latex)
    
    cl_filename = "cover_letter.tex"
    cl_path = os.path.join(output_dir, cl_filename)
    save_file(cl_path, cl_latex)

    # 6. Render Cover Letter
    print("Rendering Cover Letter...")
    if PDFRenderer.render_tex(cl_path, output_dir=output_dir):
        print(f"Cover Letter rendered successfully: {os.path.join(output_dir, 'cover_letter.pdf')}")
    else:
            print("Failed to render Cover Letter.")

    # 7. Generate Email (conditional)
    if config["generate_email"]:
        print("Drafting Email...")
        # Extract letter body from cover letter LaTeX for email generation
    # This is a simple extraction - in production you might want more sophisticated parsing
    letter_body_start = cl_latex.find("\\begin{document}")
    letter_body_end = cl_latex.find("\\end{document}")
    if letter_body_start != -1 and letter_body_end != -1:
        letter_content = cl_latex[letter_body_start:letter_body_end]
    else:
        letter_content = "Cover letter content"
    
    email_prompt = f"Job Analysis:\n{json.dumps(job_analysis)}\n\nCover Letter Content:\n{letter_content}"
    email_content_str = ai.generate_response(SYSTEM_PROMPT_EMAIL_GENERATOR, email_prompt)
    email_data = JSONParser.parse(email_content_str)
    
    print("\n--- Draft Email ---")
    print(f"Subject: {email_data.get('subject')}")
    print(f"Body:\n{email_data.get('body')}")
    print("-------------------")

if __name__ == "__main__":
    main()

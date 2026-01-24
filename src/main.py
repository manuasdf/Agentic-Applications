import os
import sys
import json
import argparse
from dotenv import load_dotenv
from typing import Dict, Any

# Add src to path
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from src.ai_interface import MistralProvider
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
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)

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
    return f"\\cvitem{{Skills}}{{ {', '.join(skills_list)} }}"

def format_languages(languages_list: list) -> str:
    return f"\\cvitem{{Languages}}{{ {', '.join(languages_list)} }}"

def main():
    load_dotenv()
    
    parser = argparse.ArgumentParser(description="AutoCV Generator")
    parser.add_argument("url", help="URL of the job posting")
    parser.add_argument("--profile", default="data/candidate_profile.md", help="Path to candidate profile")
    args = parser.parse_args()

    # 1. Setup
    try:
        ai = MistralProvider()
    except ValueError as e:
        print(f"Error: {e}")
        return

    print(f"Fetching job from: {args.url}")
    job_text = WebScraper.get_page_content(args.url)
    if not job_text:
        print("Failed to fetch job content.")
        return

    candidate_profile = load_file(args.profile)

    # 2. Analyze Job
    print("Analyzing job...")
    job_analysis_str = ai.generate_response(SYSTEM_PROMPT_JOB_ANALYZER, job_text)
    job_analysis = JSONParser.parse(job_analysis_str)
    print(f"Job Title: {job_analysis.get('job_title')}")
    print(f"Company: {job_analysis.get('company')}")

    # 3. Generate CV Content
    print("Generating CV content...")
    cv_prompt = f"Candidate Profile:\n{candidate_profile}\n\nJob Analysis:\n{json.dumps(job_analysis)}\n"
    cv_content_str = ai.generate_response(SYSTEM_PROMPT_CV_GENERATOR, cv_prompt)
    cv_data = JSONParser.parse(cv_content_str)

    # Pre-process lists into LaTeX strings
    cv_data['experience_section'] = format_experience(cv_data.get('experience', []))
    cv_data['education_section'] = format_education(cv_data.get('education', []))
    cv_data['skills_section'] = format_skills(cv_data.get('skills', []))
    cv_data['languages_section'] = format_languages(cv_data.get('languages', []))

    # Load Template and Fill
    cv_template = load_file("templates/cv_template.tex")
    cv_latex = fill_template(cv_template, cv_data)
    save_file("cv.tex", cv_latex)

    # 4. Render CV
    print("Rendering CV...")
    if PDFRenderer.render_tex("cv.tex"):
        print("CV rendered successfully: cv.pdf")
    else:
        print("Failed to render CV.")

    # 5. Generate Cover Letter Content
    print("Generating Cover Letter content...")
    cl_prompt = f"Candidate Profile:\n{candidate_profile}\n\nJob Analysis:\n{json.dumps(job_analysis)}\n\nCV Content:\n{json.dumps(cv_data)}"
    cl_content_str = ai.generate_response(SYSTEM_PROMPT_COVER_LETTER_GENERATOR, cl_prompt)
    cl_data = JSONParser.parse(cl_content_str)

    # Load Template and Fill
    cl_template = load_file("templates/cover_letter_template.tex")
    # Add common fields from CV data if missing in CL data
    if 'name' not in cl_data: cl_data['name'] = cv_data.get('name')
    if 'address' not in cl_data: cl_data['address'] = cv_data.get('address')
    if 'city' not in cl_data: cl_data['city'] = cv_data.get('city')
    if 'country' not in cl_data: cl_data['country'] = cv_data.get('country')
    if 'phone' not in cl_data: cl_data['phone'] = cv_data.get('phone')
    if 'email' not in cl_data: cl_data['email'] = cv_data.get('email')
    
    # Opening fallback
    if 'opening' not in cl_data:
        cl_data['opening'] = "Dear Hiring Manager,"

    cl_latex = fill_template(cl_template, cl_data)
    save_file("cover_letter.tex", cl_latex)

    # 6. Render Cover Letter
    print("Rendering Cover Letter...")
    if PDFRenderer.render_tex("cover_letter.tex"):
        print("Cover Letter rendered successfully: cover_letter.pdf")
    else:
        print("Failed to render Cover Letter.")

    # 7. Generate Email
    print("Drafting Email...")
    email_prompt = f"Job Analysis:\n{json.dumps(job_analysis)}\n\nCover Letter:\n{cl_data.get('letter_body')}"
    email_content_str = ai.generate_response(SYSTEM_PROMPT_EMAIL_GENERATOR, email_prompt)
    email_data = JSONParser.parse(email_content_str)
    
    print("\n--- Draft Email ---")
    print(f"Subject: {email_data.get('subject')}")
    print(f"Body:\n{email_data.get('body')}")
    print("-------------------")

if __name__ == "__main__":
    main()

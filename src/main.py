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
    # Pre-process lists into LaTeX strings
    # We define a mapping from key to (Section Title, Formatting Function)
    section_map = {
        'experience': ('Experience', format_experience),
        'education': ('Education', format_education),
        'skills': ('Skills', format_skills),
        'languages': ('Languages', format_languages),
        # Summary is usually a string, but let's handle it if it appears in order.
        'summary': ('Summary', lambda x: x if x else "") 
    }

    # Default order if none provided
    default_order = ["summary", "experience", "skills", "education", "languages"]
    section_order = cv_data.get('section_order', default_order)
    
    cv_body = ""
    for section_key in section_order:
        if section_key in section_map:
            title, formatter = section_map[section_key]
            content_data = cv_data.get(section_key)
            if content_data:
                formatted_content = formatter(content_data)
                # Only add section if there is content
                if formatted_content.strip():
                     cv_body += f"\\section{{{title}}}\n{formatted_content}\n\n"
        else:
             # Fallback for unknown sections or if the AI invented a key
             # If the key exists in data and is a string, add it as a section
             if section_key in cv_data and isinstance(cv_data[section_key], str):
                 cv_body += f"\\section{{{section_key.capitalize()}}}\n{cv_data[section_key]}\n\n"

    cv_data['cv_body'] = cv_body

    # Load Template and Fill
    cv_template = load_file("templates/cv_template.tex")
    cv_latex = fill_template(cv_template, cv_data)
    
    # Ensure output directory exists
    output_dir = "output"
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
    cl_filename = "cover_letter.tex"
    cl_path = os.path.join(output_dir, cl_filename)
    save_file(cl_path, cl_latex)

    # 6. Render Cover Letter
    print("Rendering Cover Letter...")
    if PDFRenderer.render_tex(cl_path, output_dir=output_dir):
        print(f"Cover Letter rendered successfully: {os.path.join(output_dir, 'cover_letter.pdf')}")
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

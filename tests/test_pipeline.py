import sys
import os
import json
import unittest
from unittest.mock import MagicMock, patch

# Add src to path
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from src.ai_interface import AIProvider
from src.tools import PDFRenderer, JSONParser
from src.main import fill_template, format_experience, format_education, format_skills, format_languages

class MockAIProvider(AIProvider):
    def generate_response(self, system_prompt: str, user_prompt: str, model: str = "mistral-large-latest") -> str:
        if "job analyst" in system_prompt.lower():
            return json.dumps({
                "job_title": "Senior Python Developer",
                "company": "Tech Solutions GmbH",
                "language": "en",
                "key_skills": ["Python", "Django", "AWS"],
                "summary": "Looking for an experienced dev.",
                "fit_assessment": "Good fit."
            })
        elif "cv writer" in system_prompt.lower():
            return json.dumps({
                "name": "Manu",
                "title": "Senior Python Developer",
                "summary": "Experienced developer...",
                "experience": [
                    {"role": "Dev", "company": "A", "dates": "2020-2022", "details": ["Did X", "Did Y"]}
                ],
                "education": ["BSc CS"],
                "skills": ["Python", "Go"],
                "languages": ["English", "German"]
            })
        elif "cover letter" in system_prompt.lower():
            return json.dumps({
                "recipient_name": "Hiring Manager",
                "company_name": "Tech Solutions GmbH",
                "company_address": "Berlin",
                "letter_body": "I am writing to apply...",
                "opening": "Dear Hiring Manager,"
            })
        elif "email" in system_prompt.lower():
            return json.dumps({
                "subject": "Application for Senior Python Developer",
                "body": "Please find attached..."
            })
        return "{}"

class TestAutoCV(unittest.TestCase):
    def test_json_parser(self):
        text = "Some text ```json {\"a\": 1} ``` more text"
        data = JSONParser.parse(text)
        self.assertEqual(data.get("a"), 1)

    def test_template_filling(self):
        template = "Hello <<name>>"
        data = {"name": "World"}
        self.assertEqual(fill_template(template, data), "Hello World")

    @patch('src.tools.subprocess.run')
    def test_pdf_renderer(self, mock_run):
        mock_run.return_value.returncode = 0
        self.assertTrue(PDFRenderer.render_tex("dummy.tex"))

    def test_full_flow_logic(self):
        # This tests the logic flow using the MockAIProvider
        ai = MockAIProvider()
        
        # 1. Analyze
        job_analysis = json.loads(ai.generate_response("job analyst", "job text"))
        self.assertEqual(job_analysis['job_title'], "Senior Python Developer")

        # 2. CV
        cv_data = json.loads(ai.generate_response("cv writer", "profile + job"))
        cv_data['experience_section'] = format_experience(cv_data.get('experience', []))
        
        # Load template (mock reading file)
        with open("templates/cv_template.tex", "r") as f:
            cv_template = f.read()
        
        cv_latex = fill_template(cv_template, cv_data)
        self.assertIn("Manu", cv_latex)
        self.assertIn("Senior Python Developer", cv_latex)

if __name__ == '__main__':
    unittest.main()

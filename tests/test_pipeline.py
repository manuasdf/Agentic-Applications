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
            # New approach: return complete LaTeX document
            return '''\\documentclass[11pt,a4paper]{article}
\\usepackage[utf8]{inputenc}
\\usepackage[english]{babel} 
\\usepackage{geometry}
\\usepackage{enumitem}
\\usepackage{hyperref}

\\geometry{
  left=2cm,
  right=2cm,
  top=2cm,
  bottom=5cm
}

\\hypersetup{
    colorlinks=true,
    linkcolor=black,
    urlcolor=black
}

\\begin{document}

% Personal Information
\\begin{center}
    {\\Large \\textbf{Manu}} \\\
    \\textbf{Senior Python Developer} \\\
    Berlin, Germany \\\
    +123456789 - test@example.com -
    \\href{https://linkedin.com/in/test}{test}
\\end{center}

\\section{Experience}
\\cventry{2020-2022}{Dev}{A}{}{}{{
\\begin{itemize}
\\item Did X
\\item Did Y
\\end{itemize}
}

\\section{Education}
\\cvitem{{}}{{ BSc CS }}

\\section{Skills}
\\cvitem{Skills}{ Python, Go }

\\section{Languages}
\\cvitem{Languages}{ English, German }

\\end{document}'''
        elif "cover letter" in system_prompt.lower():
            # New approach: return complete LaTeX document
            return '''\\documentclass[11pt,a4paper]{article}
\\usepackage[english]{babel}
\\usepackage[T1]{fontenc}
\\usepackage[utf8]{inputenc}
\\usepackage{geometry}
\\usepackage{setspace}
\\usepackage{hyperref}
\\usepackage[none]{hyphenat}

\\geometry{
  left=2.5cm,
  right=2.5cm,
  top=2.5cm,
  bottom=2.5cm
}

\\hypersetup{
    colorlinks=true,
    linkcolor=black,
    urlcolor=black
}

\\setlength{\\parindent}{0pt}
\\setlength{\\parskip}{1em}

\\begin{document}
\\emergencystretch 3em


\\begin{flushright}
Manu\\\
Berlin, Germany\\\
test@example.com\\\
\\href{https://linkedin.com/in/test}{test}
\\end{flushright}

Tech Solutions GmbH\\\
Berlin

\\begin{flushright}
Berlin, \\today
\\end{flushright}

\\vspace{1em}

\\textbf{Application for Senior Python Developer Position}

\\vspace{1em}

Dear Hiring Manager,

\\vspace{1em}

I am writing to apply for the Senior Python Developer position at Tech Solutions GmbH. I am writing to apply...

\\vspace{1em}

Sincerely,

Manu

\\end{document}'''
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
        # This tests the logic flow using the MockAIProvider with the new template-aware approach
        ai = MockAIProvider()
        
        # 1. Analyze
        job_analysis = json.loads(ai.generate_response("job analyst", "job text"))
        self.assertEqual(job_analysis['job_title'], "Senior Python Developer")

        # 2. CV - New approach: AI receives template and generates complete LaTeX
        # Load template
        with open("templates/cv_template.tex", "r") as f:
            cv_template = f.read()
        
        # Create prompt with template (simulating the new workflow)
        cv_prompt = f"LaTeX Template:\n{cv_template}\n\nCandidate Profile:\nprofile content\n\nJob Analysis:\n{json.dumps(job_analysis)}\nBabel Language: english\n"
        
        # AI should generate complete LaTeX (mock response)
        cv_latex = ai.generate_response("cv writer", cv_prompt)
        
        # Verify the AI generated LaTeX contains expected elements
        self.assertIn("\\documentclass", cv_latex)
        self.assertIn("Senior Python Developer", cv_latex)
        self.assertIn("\\section{Experience}", cv_latex)
        
        # 3. Cover Letter - New approach
        with open("templates/cover_letter_template.tex", "r") as f:
            cl_template = f.read()
        
        cl_prompt = f"LaTeX Template:\n{cl_template}\n\nCandidate Profile:\nprofile content\n\nJob Analysis:\n{json.dumps(job_analysis)}\nCV LaTeX Content:\n{cv_latex}\nBabel Language: english\n"
        
        cl_latex = ai.generate_response("cover letter", cl_prompt)
        
        # Verify cover letter LaTeX
        self.assertIn("\\documentclass", cl_latex)
        self.assertIn("Tech Solutions GmbH", cl_latex)

if __name__ == '__main__':
    unittest.main()

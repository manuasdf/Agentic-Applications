import requests
from bs4 import BeautifulSoup
import subprocess
import json
import re
import os
from typing import List, Dict, Any

class WebScraper:
    @staticmethod
    def get_page_content(url: str) -> str:
        try:
            response = requests.get(url, timeout=10)
            response.raise_for_status()
            soup = BeautifulSoup(response.content, 'html.parser')
            # Remove script and style elements
            for script in soup(["script", "style"]):
                script.decompose()
            text = soup.get_text(separator='\n')
            # Break into lines and remove leading and trailing space on each
            lines = (line.strip() for line in text.splitlines())
            # Break multi-headlines into a line each
            chunks = (phrase.strip() for line in lines for phrase in line.split("  "))
            # Drop blank lines
            text = '\n'.join(chunk for chunk in chunks if chunk)
            return text
        except Exception as e:
            print(f"Error fetching URL {url}: {e}")
            return ""


class PDFExtractor:
    @staticmethod
    def extract_text(pdf_path: str) -> str:
        """Extract text from a PDF file."""
        try:
            from PyPDF2 import PdfReader
            reader = PdfReader(pdf_path)
            text = ""
            for page in reader.pages:
                page_text = page.extract_text()
                if page_text:
                    text += page_text + "\n"
            # Clean up the text
            text = text.strip()
            # Replace multiple newlines with single newlines
            text = re.sub(r'\n{3,}', '\n\n', text)
            return text
        except ImportError:
            print("Error: PyPDF2 is not installed. Run: pip install pypdf2")
            return ""
        except Exception as e:
            print(f"Error reading PDF {pdf_path}: {e}")
            return ""


class MarkdownExtractor:
    @staticmethod
    def extract_text(md_path: str) -> str:
        """Extract text from a Markdown file."""
        try:
            with open(md_path, 'r', encoding='utf-8') as f:
                text = f.read()
            # Clean up the text
            text = text.strip()
            # Replace multiple newlines with single newlines
            text = re.sub(r'\n{3,}', '\n\n', text)
            return text
        except Exception as e:
            print(f"Error reading Markdown {md_path}: {e}")
            return ""

class Memory:
    def __init__(self, max_items: int = 5):
        self.items: List[str] = []
        self.max_items = max_items

    def add(self, item: str):
        self.items.append(item)
        if len(self.items) > self.max_items:
            self.items.pop(0)

    def get_all(self) -> List[str]:
        return self.items

    def clear(self):
        self.items = []

class PDFRenderer:
    @staticmethod
    def render_tex(tex_file_path: str, output_dir: str = ".") -> bool:
        try:
            # Run pdflatex twice to resolve references if needed, but once is usually enough for simple CVs
            # Using -interaction=nonstopmode to prevent hanging on errors
            cmd = ['pdflatex', '-interaction=nonstopmode', '-output-directory', output_dir, tex_file_path]
            result = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
            if result.returncode != 0:
                # Decode output with error handling for non-UTF-8 characters
                stdout_text = result.stdout.decode('utf-8', errors='replace') if result.stdout else ""
                stderr_text = result.stderr.decode('utf-8', errors='replace') if result.stderr else ""
                print(f"Error rendering PDF: {stdout_text}\n{stderr_text}")
                return False
            return True
        except Exception as e:
            print(f"Exception rendering PDF: {e}")
            return False

class JSONParser:
    @staticmethod
    def parse(text: str) -> Dict[str, Any]:
        """Extracts JSON from a string that might contain other text."""
        try:
            # Try to find JSON block
            match = re.search(r'\{.*\}', text, re.DOTALL)
            if match:
                json_str = match.group(0)
                return json.loads(json_str)
            return json.loads(text)
        except json.JSONDecodeError as e:
            print(f"Error parsing JSON: {e}")
            return {}

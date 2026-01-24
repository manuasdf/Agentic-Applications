# Automated CV and Cover Letter Generator

An AI-powered tool that automates the creation of tailored CVs and Cover Letters for job applications. It analyzes job postings using the Mistral API and generates customized application documents in LaTeX/PDF format.

## Features

- **Job Analysis**: Extracts key requirements and details from job posting URLs.
- **Tailored Content**: Generates a CV and Cover Letter specifically adapted to the job description using your candidate profile.
- **PDF Generation**: Renders professional-looking documents using LaTeX.
- **Email Draft**: Creates a ready-to-send email for your application.

## Prerequisites

- **Python 3.8+**
- **LaTeX Distribution**: You need a TeX distribution installed (e.g., TeX Live, MiKTeX) to compile the PDFs.
  - On Ubuntu/Debian: `sudo apt-get install texlive-full`
- **Mistral API Key**: You need an API key from [Mistral AI](https://console.mistral.ai/).

## Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/manuasdf/Agentic-Applications.git
   cd "Agentic Applications"
   ```

2. **Create and activate a virtual environment**
   ```bash
   python3 -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Set up environment variables**
   Create a `.env` file in the root directory and add your Mistral API key:
   ```bash
   MISTRAL_API_KEY=your_api_key_here
   ```

## Usage

1. **Prepare your profile**
   Ensure your candidate profile is updated in `data/candidate_profile.md`.

2. **Run the generator**
   ```bash
   python src/main.py <job_posting_url>
   ```

   **Options:**
   - `--profile <path>`: Specify a custom path to your candidate profile (default: `data/candidate_profile.md`).

   **Example:**
   ```bash
   python src/main.py https://example.com/job-posting --profile my_profile.md
   ```

3. **Output**
   The tool will generate the following files in the root directory:
   - `cv.tex` & `cv.pdf`: The tailored CV.
   - `cover_letter.tex` & `cover_letter.pdf`: The tailored Cover Letter.
   - Console Output: A draft email for the application.

## Project Structure

- `src/`: Source code for the application.
  - `main.py`: Entry point.
  - `ai_interface.py`: Handles interactions with the Mistral API.
  - `tools.py`: Utilities for web scraping, PDF rendering, and JSON parsing.
  - `prompts.py`: System prompts for the AI.
- `templates/`: LaTeX templates for CV and Cover Letter.
- `data/`: Data files, including the candidate profile.
- `tests/`: Unit tests.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

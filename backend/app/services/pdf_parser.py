import io
from pypdf import PdfReader

def parse_pdf(contents: bytes) -> str:
    reader = PdfReader(io.BytesIO(contents))
    pages = []
    for page in reader.pages:
        text = page.extract_text()
        if text:
            pages.append(text.strip())
    return "\n\n".join(pages)
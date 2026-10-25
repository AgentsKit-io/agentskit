| Adapter | Image wire format | File wire format | Tested sources / limits |
| --- | --- | --- | --- |
| openai | image_url | file | image URL/data URL; file data URL/id |
| openai-compatible | image_url | file | same wire format; opt into model capability |
| anthropic | image | document | image URL/data URL; PDF URL/data URL; text data URL |
| gemini | inlineData/fileData | inlineData/fileData | data URL or provider URI with MIME type |
| vertex | inlineData/fileData | inlineData/fileData | data URL or provider URI with MIME type |
| ollama | images | image data URL only | image data URL only; vision model required; PDF rejected |

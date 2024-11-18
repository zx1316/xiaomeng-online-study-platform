import base64
import glob
import hashlib
import os
import re
from PIL import Image
from io import BytesIO

IMAGE_SAVE_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'static/img/q')
AVATAR_SAVE_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'static/img/user')


def extract_image_hashes(text):
    """Extracts MD5 hashed filenames from <img> tags in a text field."""
    return set(re.findall(r'%%%([^@]+)@@@', text))


def save_image(base64_str, _type="question"):
    try:
        image_data = base64.b64decode(base64_str)
    except base64.binascii.Error:
        return None, "Invalid base64 image encoding"
    # Verify
    if image_data[:8] != b'\x89PNG\r\n\x1a\n':
        return None, "Image must be in PNG format"

    if _type is not "question":
        try:
            image = Image.open(BytesIO(image_data))
        except Exception as e:
            return None, f"Cannot open.Invalid image data: {str(e)}"
        max_dimension = max(image.size)
        if max_dimension > 128:
            scale_ratio = 128 / max_dimension
            new_size = (int(image.size[0] * scale_ratio), int(image.size[1] * scale_ratio))
            image = image.resize(new_size, Image.ANTIALIAS)
            output = BytesIO()
            image.save(output, format='PNG')
            image_data = output.getvalue()

    md5_hash = hashlib.md5(image_data).hexdigest()
    file_name = f"{md5_hash}.png"
    if _type is "question":
        file_path = os.path.join(IMAGE_SAVE_PATH, file_name)
    else:
        file_path = os.path.join(AVATAR_SAVE_PATH, file_name)
    with open(file_path, 'wb') as f:
        f.write(image_data)
    return file_name, None


def check_duplicate_image(filename):
    check_path = os.path.join(os.getcwd(), 'static', 'img', 'q')
    name, ext = os.path.splitext(filename)
    search_pattern = os.path.join(check_path, f"{name}.*")
    matches = glob.glob(search_pattern)
    for match in matches:
        if match.endswith(ext):
            return True
    return False


def process_images_and_text(data, old_data=None):
    text_fields = ['Question', 'SelectionA', 'SelectionB', 'SelectionC', 'SelectionD']
    placeholder_pattern = r"%%%(.*?)@@@"
    updated_image_hashes = set()

    for field in text_fields:
        if field in data and data[field]:
            placeholders = set(re.findall(placeholder_pattern, data[field]))

            for placeholder in placeholders:
                image_key = placeholder
                if image_key not in data:
                    if old_data is None:
                        return None, f"Missing image for placeholder '{image_key}'"
                    else:
                        if not check_duplicate_image(image_key):
                            return None, f"Missing image for placeholder '{image_key}'"
                        else:
                            updated_image_hashes.add(image_key)
                            continue
                image_filename, error = save_image(data[image_key])
                print("image_name:", image_filename)
                if error:
                    return None, error
                img_tag = f'%%%{image_filename}@@@'
                data[field] = data[field].replace(f"%%%{placeholder}@@@", img_tag)
                print("question:", data[field])
                updated_image_hashes.add(image_filename)
    if old_data:
        old_image_hashes = set()
        for field in text_fields:
            if old_data.get(field):
                old_image_hashes.update(extract_image_hashes(old_data[field]))

        # Delete images in old_data but not in new_data
        unused_images = old_image_hashes - updated_image_hashes
        for image_filename in unused_images:
            image_path = os.path.join(IMAGE_SAVE_PATH, image_filename)
            if os.path.exists(image_path):
                os.remove(image_path)

    return data, None

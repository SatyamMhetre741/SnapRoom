
import cv2
from pathlib import Path
from insightface.app import FaceAnalysis

# 1. Initialize InsightFace
app = FaceAnalysis(
    name="buffalo_l",
    providers=["CPUExecutionProvider"]
)

# 2. Load the model
print("Loading buffalo_l model...")

app.prepare(
    ctx_id=-1,
    det_size=(640, 640)
)

print("Model loaded successfully!")

# 3. Define folders
input_folder = Path("sample_photos")
output_folder = Path("output")

output_folder.mkdir(exist_ok=True)

# 4. Process all photographs
image_extensions = {".jpg", ".jpeg", ".png"}

for image_path in input_folder.iterdir():

    if image_path.suffix.lower() not in image_extensions:
        continue

    print(f"\nProcessing: {image_path.name}")

    # Read photograph
    image = cv2.imread(str(image_path))

    if image is None:
        print("Could not read image")
        continue

    # Detect faces
    faces = app.get(image)

    print(f"Faces detected: {len(faces)}")

    # Process each detected face
    for index, face in enumerate(faces):

        embedding = face.embedding
        bounding_box = face.bbox

        print(f"Face {index + 1}")
        print(f"Bounding box: {bounding_box}")
        print(f"Embedding dimensions: {embedding.shape}")
        print(f"First 5 embedding values: {embedding[:5]}")

    # Draw boxes around detected faces
    result_image = app.draw_on(image, faces)

    # Save output
    output_path = output_folder / image_path.name

    cv2.imwrite(str(output_path), result_image)

print("\nProcessing completed!")

import os
from PIL import Image
import numpy as np
import matplotlib.colors as mcolors

def shift_hue(arr, hue_shift):
    r, g, b, a = np.rollaxis(arr, axis=-1)
    hsv = mcolors.rgb_to_hsv(np.dstack((r, g, b)) / 255.0)
    hsv[..., 0] = (hsv[..., 0] + hue_shift) % 1.0
    rgb = mcolors.hsv_to_rgb(hsv) * 255.0
    new_arr = np.dstack((rgb[:, :, 0], rgb[:, :, 1], rgb[:, :, 2], a))
    return new_arr.astype(np.uint8)

def generate_variants():
    assets_dir = './assets'
    icon_path = os.path.join(assets_dir, 'icon.png')
    adaptive_icon_path = os.path.join(assets_dir, 'adaptive-icon.png')

    # Adjusted hue shifts to preserve the "double color" gradient 
    # while completely eliminating the pink shading in the Red variant.
    variants = {
        'red': 0.50,
        'green': 0.80,
        'purple': 0.10,
        'orange': 0.45
    }

    def process_image(src, basename):
        if not os.path.exists(src):
            print(f"File not found: {src}")
            return
            
        img = Image.open(src).convert('RGBA')
        arr = np.array(img)
        
        for name, shift in variants.items():
            new_arr = shift_hue(arr, shift)
            new_img = Image.fromarray(new_arr, 'RGBA')
            dest = os.path.join(assets_dir, f"{basename.split('.')[0]}-{name}.png")
            new_img.save(dest)
            print(f"Created {dest}")

    process_image(icon_path, 'icon.png')
    process_image(adaptive_icon_path, 'adaptive-icon.png')

if __name__ == '__main__':
    generate_variants()

"""Import junwatu/indonesian-recipes into SIPAGI-compatible recipe rows.

Run after accepting the dataset terms on Hugging Face and installing datasets:
    pip install datasets
    python scripts/import_indonesian_recipes.py
"""

from __future__ import annotations

import csv
import json
from pathlib import Path

from datasets import load_dataset


OUT_DIR = Path(__file__).resolve().parents[1] / "data" / "imports"
OUT_DIR.mkdir(parents=True, exist_ok=True)


def main() -> None:
    ds = load_dataset("junwatu/indonesian-recipes")
    split_name = "train" if "train" in ds else next(iter(ds.keys()))
    rows = ds[split_name]

    recipes_path = OUT_DIR / "recipes_from_indonesian_recipes.csv"
    components_path = OUT_DIR / "recipe_components_from_indonesian_recipes.csv"

    with recipes_path.open("w", newline="", encoding="utf-8") as recipe_file, components_path.open("w", newline="", encoding="utf-8") as component_file:
        recipe_writer = csv.DictWriter(recipe_file, fieldnames=["recipe_id", "name", "portion_size", "target_age_group", "nutrition_target_json", "status", "created_by"])
        component_writer = csv.DictWriter(component_file, fieldnames=["component_id", "recipe_id", "item_name", "qty_per_portion", "unit", "notes"])
        recipe_writer.writeheader()
        component_writer.writeheader()

        for index, recipe in enumerate(rows):
            recipe_id = f"recipe_id_{index + 1:05d}"
            recipe_writer.writerow({
                "recipe_id": recipe_id,
                "name": recipe.get("title", f"Resep {index + 1}"),
                "portion_size": "1 porsi",
                "target_age_group": "MBG",
                "nutrition_target_json": json.dumps({"source": "junwatu/indonesian-recipes", "steps": recipe.get("steps", [])}, ensure_ascii=False),
                "status": "draft",
                "created_by": "import_huggingface",
            })
            for item_index, ingredient in enumerate(recipe.get("ingredients") or []):
                component_writer.writerow({
                    "component_id": f"component_id_{index + 1:05d}_{item_index + 1:02d}",
                    "recipe_id": recipe_id,
                    "item_name": ingredient,
                    "qty_per_portion": "",
                    "unit": "",
                    "notes": "Perlu normalisasi item inventory",
                })

    print(f"Saved {recipes_path}")
    print(f"Saved {components_path}")


if __name__ == "__main__":
    main()

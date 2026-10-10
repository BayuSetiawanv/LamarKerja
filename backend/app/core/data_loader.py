import json
import logging
from pathlib import Path
from typing import Dict, Any, Optional

logger = logging.getLogger(__name__)

class DataLoader:
    """
    Singleton class to load and cache all JSON reference data into memory.
    This prevents reading from disk on every API request.
    """
    _instance: Optional['DataLoader'] = None
    _data: Dict[str, Any] = {}

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(DataLoader, cls).__new__(cls)
            cls._instance._load_all_data()
        return cls._instance

    def _load_all_data(self):
        # Asumsi folder 'data' berada di root proyek (D:\LamarKerja\data)
        # Kita naik 3 level dari file ini: core -> app -> backend -> root
        base_dir = Path(__file__).resolve().parent.parent.parent.parent
        data_dir = base_dir / "data"
        
        logger.info(f"📂 Mencari folder data di: {data_dir}")

        if not data_dir.exists():
            logger.error(f"❌ Folder data tidak ditemukan di {data_dir}")
            return

        # Daftar file JSON yang wajib dimuat
        files_to_load = [
            "skills_database.json",
            "ats_rules.json",
            "action_verbs.json",
            "departments.json",
            "prompt_templates.json",
            "scoring_criteria.json",
            "experience_levels.json",
            "job_title_mappings.json",
            "edge_cases.json",
            "document_templates.json"
        ]

        for file_name in files_to_load:
            file_path = data_dir / file_name
            key_name = file_name.replace(".json", "")
            
            if file_path.exists():
                try:
                    with open(file_path, 'r', encoding='utf-8') as f:
                        self._data[key_name] = json.load(f)
                    logger.info(f"✅ Berhasil memuat: {file_name}")
                except json.JSONDecodeError:
                    logger.error(f"❌ Format JSON salah pada file: {file_name}")
            else:
                logger.warning(f"⚠️ File tidak ditemukan (akan di-skip): {file_name}")

    def get(self, key: str, default: Any = None) -> Any:
        """Mengambil data berdasarkan nama file (tanpa .json)"""
        return self._data.get(key)

    def get_all_keys(self) -> list:
        """Melihat daftar data apa saja yang berhasil dimuat"""
        return list(self._data.keys())

# Instansiasi global agar mudah di-import di mana saja
data_store = DataLoader()
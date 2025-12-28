import json
from typing import Generic, TypeVar, List, Optional
from anyio import Path
from pydantic import BaseModel, parse_obj_as

T = TypeVar("T", bound=BaseModel)

class JsonRepository(Generic[T]):
    def __init__(self, file_path: str, model: type[T]):
        self.file_path = Path(file_path)
        self.model = model

    async def _ensure_dir(self):
        parent = self.file_path.parent
        if not await parent.exists():
             await parent.mkdir(parents=True, exist_ok=True)

    async def read_all(self) -> List[T]:
        if not await self.file_path.exists():
            return []
        try:
            content = await self.file_path.read_text(encoding="utf-8")
            data = json.loads(content)
            # Handle list vs single object logic if needed, but assuming List[T] for now or generic list
            # Actually for generality let's assume this repo manages a List of items
            return parse_obj_as(List[self.model], data)
        except (ValueError, json.JSONDecodeError):
            return []

    async def save_all(self, items: List[T]):
        await self._ensure_dir()
        data = [item.dict() for item in items]
        await self.file_path.write_text(json.dumps(data, indent=2), encoding="utf-8")

    async def add(self, item: T) -> List[T]:
        items = await self.read_all()
        items.append(item)
        await self.save_all(items)
        return items

    async def delete(self, item_id: str, id_field: str = "id") -> bool:
        items = await self.read_all()
        initial_len = len(items)
        items = [i for i in items if getattr(i, id_field) != item_id]
        if len(items) < initial_len:
            await self.save_all(items)
            return True
        return False

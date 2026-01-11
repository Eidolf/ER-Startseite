import json
from typing import Generic, TypeVar

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

    async def read_all(self) -> list[T]:
        try:
            if not await self.file_path.exists():
                return []
            content = await self.file_path.read_text(encoding="utf-8")
            data = json.loads(content)
            # Handle list vs single object logic if needed, but assuming List[T] for now or generic list
            # Actually for generality let's assume this repo manages a List of items
            return parse_obj_as(list[self.model], data)  # type: ignore
        except PermissionError:
            print(f"ERROR: Permission denied reading {self.file_path}", flush=True)
            return []
        except (ValueError, json.JSONDecodeError):
            return []
        except Exception as e:
            print(f"ERROR: Failed reading {self.file_path}: {e}", flush=True)
            return []

    async def save_all(self, items: list[T]):
        await self._ensure_dir()
        # Use model_dump(mode='json') to ensure HttpUrl and strict types are serialized
        data = [item.model_dump(mode="json") for item in items]
        await self.file_path.write_text(json.dumps(data, indent=2), encoding="utf-8")

    async def add(self, item: T) -> list[T]:
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

    async def update(
        self, item_id: str, update_data: dict, id_field: str = "id"
    ) -> T | None:
        items = await self.read_all()
        for i, item in enumerate(items):
            if getattr(item, id_field) == item_id:
                curr_data = item.model_dump(mode="json")
                curr_data.update(update_data)
                new_item = self.model(**curr_data)
                items[i] = new_item
                await self.save_all(items)
                return new_item
        return None

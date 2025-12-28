import asyncio
from app.repositories.repos import ConfigRepository, AppRepository
from app.schemas.config import AppConfig

async def check_permissions():
    print("Checking repository paths...")
    
    # Test Config Repo
    config_repo = ConfigRepository()
    print(f"Config path: {config_repo._repo.file_path}")
    try:
        config = await config_repo.get_config()
        print("Config read success.")
        await config_repo.save_config(config)
        print("Config write success.")
    except Exception as e:
        print(f"Config Error: {e}")

    # Test App Repo
    app_repo = AppRepository()
    print(f"App path: {app_repo.file_path}")
    try:
        apps = await app_repo.read_all()
        print(f"Apps read success ({len(apps)} apps).")
        # await app_repo.save_all(apps)
        # print("Apps write success.")
    except Exception as e:
        print(f"App Error: {e}")

if __name__ == "__main__":
    asyncio.run(check_permissions())

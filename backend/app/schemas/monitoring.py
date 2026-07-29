from typing import Any, Literal
from pydantic import BaseModel, Field


class MonitoringEntity(BaseModel):
    id: str
    provider_id: str
    name: str
    domain: str  # sensor, binary_sensor, network, server, etc.
    value_type: str  # numeric, string, boolean
    state: Any
    unit_of_measurement: str | None = None
    icon: str | None = None
    last_updated: str | None = None
    attributes: dict[str, Any] = Field(default_factory=dict)


class MonitoringCard(BaseModel):
    id: str
    title: str
    card_type: str  # gauge, live_traffic, status_beacon, metric_card
    entity_ids: list[str]
    zone_id: str = "network"
    x: int = 0
    y: int = 0
    w: int = 1
    h: int = 1
    settings: dict[str, Any] = Field(default_factory=dict)


class MonitoringZone(BaseModel):
    id: str
    name: str
    icon: str = "Activity"


class MonitoringProviderConfig(BaseModel):
    id: str
    name: str
    type: str  # varco, homeassistant, prometheus, uptime_kuma, etc.
    enabled: bool = True
    url: str | None = None
    api_key: str | None = Field(default=None, exclude=True)
    settings: dict[str, Any] = Field(default_factory=dict)


class MonitoringConfig(BaseModel):
    version: str = "1.0.0"
    enabled: bool = True
    demo_mode: bool = True
    zones: list[MonitoringZone] = Field(default_factory=list)
    cards: list[MonitoringCard] = Field(default_factory=list)
    entities: list[MonitoringEntity] = Field(default_factory=list)
    providers: list[MonitoringProviderConfig] = Field(default_factory=list)


class VarcoManifestImportPayload(BaseModel):
    manifest: dict[str, Any] | list[Any] | None = None
    brief_content: str | None = None
    share_url: str | None = None

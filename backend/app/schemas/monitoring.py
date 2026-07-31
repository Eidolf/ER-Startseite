from typing import Any

from pydantic import BaseModel, ConfigDict, Field
from pydantic.alias_generators import to_camel


class BaseMonitoringModel(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
    )


class MonitoringEntity(BaseMonitoringModel):
    id: str
    provider_id: str = "default"
    name: str
    domain: str = "sensor"  # sensor, binary_sensor, network, server, etc.
    value_type: str = "numeric"  # numeric, string, boolean
    state: Any = "N/A"
    unit_of_measurement: str | None = None
    icon: str | None = None
    last_updated: str | None = None
    attributes: dict[str, Any] = Field(default_factory=dict)


class MonitoringCard(BaseMonitoringModel):
    id: str
    title: str
    card_type: str  # gauge, live_traffic, status_beacon, metric_card
    entity_ids: list[str]
    zone_id: str = "network"
    x: int = 0
    y: int = 0
    w: int = 1
    h: int = 1
    hidden: bool = False
    settings: dict[str, Any] = Field(default_factory=dict)


class MonitoringZone(BaseMonitoringModel):
    id: str
    name: str
    icon: str = "Activity"
    hidden: bool = False


class MonitoringProviderConfig(BaseMonitoringModel):
    id: str
    name: str
    type: str  # varco, homeassistant, prometheus, uptime_kuma, etc.
    enabled: bool = False
    url: str | None = None
    api_key: str | None = Field(default=None, exclude=True)
    polling_interval_seconds: int = Field(default=15, ge=1)
    settings: dict[str, Any] = Field(default_factory=dict)


class MonitoringConfig(BaseMonitoringModel):
    version: str = "1.0.0"
    enabled: bool = True
    demo_mode: bool = True
    polling_interval_seconds: int = Field(default=15, ge=1)
    zones: list[MonitoringZone] = Field(default_factory=list)
    cards: list[MonitoringCard] = Field(default_factory=list)
    entities: list[MonitoringEntity] = Field(default_factory=list)
    providers: list[MonitoringProviderConfig] = Field(default_factory=list)


class VarcoManifestImportPayload(BaseMonitoringModel):
    manifest: dict[str, Any] | list[Any] | None = None
    brief_content: str | None = None
    share_url: str | None = None
    consumer_name: str | None = Field(default="ER-Startseite Backend Server")

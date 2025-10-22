from __future__ import annotations

from typing import Any, Dict, List

from pydantic import BaseModel, Field


class EdgeMap(BaseModel):
    """
    Field mapping between two graph nodes.
    """

    src_node: str
    dst_node: str
    field_map: Dict[str, str] = Field(default_factory=dict)


class NodeSpec(BaseModel):
    """
    Runtime node specification for exporting visual graphs.
    """

    node_id: str
    agent_name: str
    static_inputs: Dict[str, Any] = Field(default_factory=dict)


class GraphSnapshot(BaseModel):
    """
    Serializable structure consumed by the frontend renderer.
    """

    nodes: List[NodeSpec]
    edges: List[EdgeMap]


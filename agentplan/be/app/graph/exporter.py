from __future__ import annotations

from typing import Dict, List

from ..contracts.graph import EdgeMap, GraphSnapshot, NodeSpec
from ..contracts.plan import Plan


def plan_to_snapshot(plan: Plan) -> GraphSnapshot:
    """
    Converts a Plan into a GraphSnapshot used for visualization.
    """

    nodes: List[NodeSpec] = []
    edges: List[EdgeMap] = []

    for step in plan.steps:
        nodes.append(
            NodeSpec(
                node_id=step.id,
                agent_name=step.action,
                objective=step.objective,
                static_inputs={k: v for k, v in step.args.items() if not str(v).startswith("$")},
            )
        )
        for dep in step.depends_on:
            edges.append(EdgeMap(src_node=dep, dst_node=step.id, field_map={}))

    return GraphSnapshot(nodes=nodes, edges=edges)

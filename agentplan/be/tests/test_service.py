from app.contracts.api import PlanUpsertRequest, RunRequest
from app.contracts.plan import Plan, Step
from app.runtime.service import OrchestratorService


def test_service_executes_simple_plan():
    service = OrchestratorService()

    plan = Plan(
        steps=[
            Step(id="1", action="echo", depends_on=[], args={"message": "hello"}),
        ]
    )

    service.upsert_plan(
        PlanUpsertRequest(
            tenant="demo",
            plan_id="echo-plan",
            plan=plan,
        )
    )

    response = service.create_run(
        RunRequest(user_input="hi", tenant="demo", options={"plan_id": "echo-plan"})
    )

    status = service.get_run(response.run_id)
    assert status.status == "completed"


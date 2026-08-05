import asyncio
import json
import sys
import uuid

from tropass_sdk.client import GatewayClient


async def main() -> None:
    task_id = uuid.UUID(sys.argv[1])
    gateway_url = sys.argv[2]
    gateway_api_token = sys.argv[3]
    async with GatewayClient(
        gateway_url=gateway_url,
        gateway_api_token=gateway_api_token,
    ) as gateway_client:
        result = await gateway_client.wait_for_model_task(task_id)
        print(json.dumps(result, ensure_ascii=False))


asyncio.run(main())

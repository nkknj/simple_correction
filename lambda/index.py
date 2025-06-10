import json
import os
import boto3
import re
from botocore.exceptions import ClientError

def extract_region_from_arn(arn):
    match = re.search(r'arn:aws:lambda:([^:]+):', arn)
    return match.group(1) if match else 'us-east-1'

bedrock_client = None
MODEL_ID = os.environ.get('MODEL_ID', 'us.amazon.nova-lite-v1:0')

def lambda_handler(event, context):
    try:
        global bedrock_client
        if bedrock_client is None:
            region = extract_region_from_arn(context.invoked_function_arn)
            bedrock_client = boto3.client('bedrock-runtime', region_name=region)

        body = json.loads(event['body'])
        text = body.get('fileContent', '')

        # 文ごとに分割（「。」や「！？」で）
        sentences = re.split(r'(?<=[。！？])', text)
        processed = []

        for sentence in sentences:
            if not sentence.strip():
                continue
            # Bedrock にフィラー除去を指示
            messages = [
                {
                  'role': 'system',
                  'content': [{'text': '以下の日本語の文からフィラー（えー、あの、まあなど）を除去してください。'}]
                },
                {
                  'role': 'user',
                  'content': [{'text': sentence}]
                }
            ]
            payload = {
                'messages': messages,
                'inferenceConfig': {'maxTokens': 512, 'temperature': 0.5}
            }
            response = bedrock_client.invoke_model(
                modelId=MODEL_ID,
                body=json.dumps(payload),
                contentType='application/json'
            )
            resp_body = json.loads(response['body'].read())
            processed.append(resp_body['output']['message']['content'][0]['text'])

        result_text = ''.join(processed)
        return {
            'statusCode': 200,
            'headers': {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({'processedText': result_text})
        }

    except Exception as e:
        return {
            'statusCode': 500,
            'headers': {'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': str(e)})
        }

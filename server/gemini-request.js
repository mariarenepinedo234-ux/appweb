export function geminiRequest(model,key,messages,instructions){
 return [`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,{
  method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':key},
  body:JSON.stringify({systemInstruction:{parts:[{text:instructions}]},contents:messages.map(message=>({role:message.role==='assistant'?'model':'user',parts:[{text:message.content}]})),generationConfig:{maxOutputTokens:500}}),
  signal:AbortSignal.timeout(25000)
 }];
}

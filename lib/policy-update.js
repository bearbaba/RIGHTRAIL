export function preparePolicyUpdate(asset,actor,policyInput){
  if(!asset?.active)throw new Error('Asset is not active.');
  if(typeof actor!=='string'||asset.owner?.toLowerCase()!==actor.toLowerCase())
    throw new Error('Only the original Creator wallet can update this policy.');
  const policy=String(policyInput??'').trim();
  if(policy.length<48||policy.length>1600)
    throw new Error('New policy must be between 48 and 1600 characters.');
  if(policy===asset.policy)throw new Error('Policy unchanged — no transaction needed.');
  if(!Number.isSafeInteger(asset.version)||asset.version<1)
    throw new Error('Cannot verify the current asset policy version.');
  return {policy,priorVersion:asset.version};
}
export function confirmPolicyUpdate(asset,actor,policy,priorVersion){
  return Boolean(asset?.active && asset.owner?.toLowerCase()===actor?.toLowerCase() &&
    Number.isSafeInteger(priorVersion)&&asset.version===priorVersion+1&&asset.policy===policy);
}

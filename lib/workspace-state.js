let owner=null,account=null;const listeners=new Set();
function emit(){for(const fn of listeners)fn({owner,account});}
export function workspaceState(){return {owner,account};}
export function subscribe(fn){listeners.add(fn);fn(workspaceState());return()=>listeners.delete(fn);}
export function updateAccount(value){account=value?value.toLowerCase():null;emit();}
export function acquire(kind){if(owner)return false;owner=kind;emit();return true;}
export function release(kind){if(owner===kind){owner=null;emit();}}

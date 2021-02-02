const ZILLIQA_API = "https://api.zilliqa.com/";
const UD_REGISTRY_CONTRACT_ADDRESS = "9611c53BE6d1b32058b2747bdeCECed7e1216793";

function namehash(name) {
  const hashArray = hash(name);
  return arrayToHex(hashArray);
}

function hash(name) {
  if (!name) {
      return new Uint8Array(32);
  }
  const [label, ...remainder] = name.split('.');
  const labelHash = sha256.array(label);
  const remainderHash = hash(remainder.join('.'));
  return sha256.array(new Uint8Array([...remainderHash, ...labelHash]));
}

function arrayToHex(arr) {
  return '0x' + Array.prototype.map.call(arr, x => ('00' + x.toString(16)).slice(-2)).join('');
}

async function fetchZilliqa(params) {
  const body = {
    method: "GetSmartContractSubState",
    id: "1",
    jsonrpc: "2.0",
    params
  };

  return await fetch(ZILLIQA_API, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body),
  }).then(res => res.json());
}

function cleanDOM(parent) {
  while (parent.firstChild) {
    parent.removeChild(parent.firstChild);
  }
}

function displayError(message, cleanDom) {
  const mainContainer = document.getElementById('records');
  if (cleanDom) {
    cleanDOM(mainContainer);
  }
  const error = document.createElement('p');
  error.style.color = "red";
  error.innerHTML = message;
  mainContainer.appendChild(error);
  return ;
}

function displayResolution(resolution) {
  const {
    ownerAddress,
    resolverAddress,
    records
  } = resolution;
  const mainContainer = document.getElementById('records');
  cleanDOM(mainContainer);

  const ownerRecord = document.createElement('span');
  ownerRecord.innerHTML = `ownerAddress: ${ownerAddress}`;

  const resolverRecord = document.createElement('span');
  resolverRecord.innerHTML = `resolverAddress: ${resolverAddress}`;

  mainContainer.appendChild(ownerRecord);
  mainContainer.appendChild(resolverRecord);

  Object.entries(records).map(([key, value]) => {
    const recordSpan = document.createElement('span');
    recordSpan.innerHTML = `${key} : ${value}`;
    mainContainer.appendChild(recordSpan);
  });

  if (!records['crypto.BTC.address']) {
    displayError('crypto.BTC.address: Record is not found', false);
  }
}

async function resolve() {
  const userInput = document.getElementById("input").value;
  if (!userInput.endsWith(".zil")) {
    displayError('domain is not supported', true);
    return;
  }

  const token = namehash(userInput);
  const registryState =
    await fetchZilliqa([UD_REGISTRY_CONTRACT_ADDRESS, "records", [token]]);

  if (registryState.result == null) {
    displayError('domain is not registered', true);
    return;
  }

  const [ownerAddress, resolverAddress] = 
    registryState.result.records[token].arguments;
  
  if (resolverAddress === "0x0000000000000000000000000000000000000000") {
    displayError('domain is not configured', true);
    return;
  }

  const recordResponse = await fetchZilliqa([
    resolverAddress.replace("0x", ""),
    "records",
    []
  ]);

  displayResolution({
    ownerAddress,
    resolverAddress,
    records: recordResponse.result.records
  });
}

document.getElementById("button").addEventListener('click', () => resolve());
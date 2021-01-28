import hash from 'hash.js';

const ZILLIQA_API = "https://api.zilliqa.com/";
const UD_REGISTRY_CONTRACT_ADDRESS = "9611c53BE6d1b32058b2747bdeCECed7e1216793";

function namehash(domain) {
  const parent =
    '0000000000000000000000000000000000000000000000000000000000000000';
  return '0x' + [parent]
    .concat(
      domain
        .split('.')
        .reverse()
    )
    .reduce((parent, label) =>
      childhash(parent, label),
    );
}

function childhash(parentHash, label) {
    parentHash = parentHash.replace(/^0x/, '');
    const labelHash = sha256(label)
    return sha256(parentHash + labelHash, "hex");
}

function sha256(message, inputEnc) {
  return hash.sha256()
    .update(message, inputEnc)
    .digest('hex');
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
  const {ownerAddress, resolverAddress, records} = resolution;
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
  const userInput = (document.getElementById("input")).value;
  if (!userInput.endsWith(".zil")) {
    displayError('domain is not supported');
    return ;
  }

  const hash = namehash(userInput);  
  const contractAddresses = await fetchZilliqa([UD_REGISTRY_CONTRACT_ADDRESS, "records", [hash]]);
  console.log(contractAddresses);
  if (contractAddresses.result == null) {
    displayError('domain is not registered', true);
    return ;
  }
  console.log(contractAddresses);
  const [ownerAddress, resolverAddress] = await contractAddresses.result.records[hash].arguments;

  if (resolverAddress === "0x0000000000000000000000000000000000000000") {
    displayError('domain is not configured', true);
    return ;
  }

  const records = await fetchZilliqa([
    resolverAddress.replace("0x", ""),
    "records",
    []
  ]).then(data => (data.result.records));
  
  displayResolution({resolverAddress, ownerAddress, records});
}

document.getElementById("button").addEventListener('click', () => resolve());

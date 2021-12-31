import Web3 from 'web3'
import { newKitFromWeb3 } from '@celo/contractkit'
import BigNumber from "bignumber.js"
import crowdfundingAbi from '../contract/crowdfunding.abi.json'
import erc20Abi from "../contract/erc20.abi.json"
import {CFContractAddress, cUSDContractAddress, ERC20_DECIMALS} from "./utils/constants";

let kit;
let contract;
let projectToBeFundedIndex;

let projects = []

const connectCeloWallet = async function () {
    // Connect to Celo Network wallet of current user
    if(!window.celo){
        notification("⚠️ Please install the CeloExtensionWallet.")
        return
    }

    try {

        notification("⚠️ Please approve this DApp to use it.")

        await window.celo.enable()
        notificationOff()


        const web3 = new Web3(window.celo)
        kit = newKitFromWeb3(web3)

        const accounts = await kit.web3.eth.getAccounts()
        kit.defaultAccount = accounts[0]

        contract = new kit.web3.eth.Contract(crowdfundingAbi, CFContractAddress)
    } catch (error) {
        notification(`⚠️ ${error}.`)
    }
    
}

async function approve(_amountDonated) {
    const cUSDContract = new kit.web3.eth.Contract(erc20Abi, cUSDContractAddress)
  
    const result = await cUSDContract.methods
      .approve(CFContractAddress, _amountDonated)
      .send({ from: kit.defaultAccount })
    return result
}



const pendingProjects = document.getElementById("pendingProjects");

const fundedProjects  = document.getElementById("fundedProjects");

const productForm = document.getElementById("productForm");



const calculatePercentage = (_product) =>{
 // Calculates how much of the goal has been reached
    const percent = (_product.amountPledged.shiftedBy(-ERC20_DECIMALS).toFixed(2) / _product.goal.shiftedBy(-ERC20_DECIMALS).toFixed(2)) * 100;
    return Math.round(percent);
}



function notification(_text) {
    document.querySelector(".alert").style.display = "block"
    document.querySelector("#notification").textContent = _text
  }
  
function notificationOff() {
    document.querySelector(".alert").style.display = "none"
}

function userLink(_address){
    
    return `https://alfajores-blockscout.celo-testnet.org/address/${_address}/transactions`
}


const pendingProjectCard = (_project) => {
    return `
            <div class="card m-2" style="width: 18rem;">
            
            <img class="card-img-top" src="${_project.projectImage}" alt="Card image cap">

            <div class="card-body">
            <h5 class="card-title">${_project.projectName}</h5>
            <p class="card-text">${_project.projectDescription}</p>
            </div>
            
            <div class="card-body">
                <a href="${userLink(_project.owner)}" class="card-link text-small">${_project.creatorName}</a>
                
            </div>


            <div class="p-1">
                <button class="btn bg-warning col donateBTN" id="${_project.index}" data-toggle="modal" data-target="#donateModal">Donate To Project</button>
            </div>

            <div class="card-footer">
                <div class="progress">
                    <div class="progress-bar bg-success" role="progressbar" style="width: ${calculatePercentage(_project)}%;" aria-valuenow="${calculatePercentage(_project)}" aria-valuemin="0" aria-valuemax="100">${calculatePercentage(_project)}%</div>
                </div>
                <div class="expected_goal p-2">
                    <span>Expected Goal: $ ${_project.goal.shiftedBy(-ERC20_DECIMALS).toFixed(2)}</span>
                </div>

                <div class="position-absolute end-0 bg-info mt-4 px-2 py-1 rounded-start number_of_donations">
                  ${_project.donationsMade} donations
                </div>
            </div>
        
        </div>
    `
};

const fundedProjectCard = (_project) => {

    return `
        <div class="card m-2" style="width: 18rem;">
        <img class="card-img-top" src="${_project.projectImage}" alt="Card image cap">

        <div class="card-body">
            <h5 class="card-title">${_project.projectName}</h5>
            <p class="card-text">${_project.projectDescription}</p>
        </div>
        
        <div class="card-body">
            <a href="${userLink(_project.owner)}" class="card-link text-small">${_project.creatorName}</a>
            
        </div>

        <div class="card-footer">
            <div class="progress">
                <div class="progress-bar bg-success" role="progressbar" style="width: ${calculatePercentage(_project)}%;" aria-valuenow="${calculatePercentage(_project)}" aria-valuemin="0" aria-valuemax="100">${calculatePercentage(_project)}%</div>
            </div>
            <div class="expected_goal p-2">
                <span>Expected Goal: $ ${_project.goal.shiftedBy(-ERC20_DECIMALS).toFixed(2)}</span>
            </div>

            <div class="position-absolute end-0 bg-info mt-4 px-2 py-1 rounded-start number_of_donations">
            ${_project.donationsMade} donations
            </div>
        </div>

    </div>
    `
}

const getProjects = async () => {
    notification("Fetching Projects!")
    
    const _projectsLength = await contract.methods.getProjectsLength().call(); // get projectlength from contract
    const _projects = []


    for (let i = 0; i < _projectsLength; i++) {
        const _project = new Promise(async (resolve, reject) => {
            const _project = await contract.methods.readProduct(i).call();
            resolve({
                owner: _project[0],
                projectName: _project[1],
                projectImage: _project[2],
                projectDescription: _project[3],
                creatorName: _project[4],
                goal: new BigNumber(_project[5]),
                amountPledged: new BigNumber(_project[6]),
                donationsMade: _project[7],
                status: _project[8],
                index: i
            });


           
        })

        _projects.unshift(_project)
       
    }
    projects = await Promise.all(_projects)

    // Get all project with status false
    const _pendingProjects = projects.filter(project => project.status === false);
    const _fundedProjects = projects.filter(project => project.status === true);

    pendingProjects.innerHTML = "";
    fundedProjects.innerHTML = "";

    _pendingProjects.forEach(project => {
        const newDiv = document.createElement("div")
        newDiv.className = "col-md-4"
        newDiv.innerHTML = pendingProjectCard(project);
        pendingProjects.appendChild(newDiv)
    })

    _fundedProjects.forEach(project => {
        const newDiv = document.createElement("div")
        newDiv.className = "col-md-4"
        newDiv.innerHTML = fundedProjectCard(project);
        fundedProjects.appendChild(newDiv)
    })

    notificationOff()
}

const addProject = async (e) => {
    // A function to add a new product to the products array
    e.preventDefault();
    
    notification("Adding Project!")
    const project_parameters = [
     document.getElementById("projectName").value,
     document.getElementById("projectImage").value,
     document.getElementById("projectDescription").value,
     document.getElementById("creatorName").value,
     new BigNumber(document.getElementById("projectGoal").value)
     .shiftedBy(ERC20_DECIMALS)
      .toString()
    ]

    try {
        
        notification(`⌛ Adding "${project_parameters[0]}"...`)
        const result = await contract.methods
          .createProject(...project_parameters)
          .send({ from: kit.defaultAccount })
          
    } catch (error) {
        notification(`⚠️ ${error}.`)
    }
  
    // // display notification and get new products
    notification(`🎉 You successfully added "${project_parameters[0]}".`)
    getProjects();

    

    // // reset modal form
    productForm.reset();

}

const getBalance = async function () {
    const totalBalance = await kit.getTotalBalance(kit.defaultAccount)
    const cUSDBalance = totalBalance.cUSD.shiftedBy(-ERC20_DECIMALS).toFixed(2)
    document.querySelector("#balance").textContent = cUSDBalance
    
}

productForm.addEventListener("submit", addProject);








window.addEventListener("load", async () => {
    notification("Loading...");
    await connectCeloWallet();
    await getBalance();
    await getProjects()
    notificationOff()
    
})


document.querySelector("#pendingProjects").addEventListener("click", (e) =>{
    // When the donate button is clicked it will get the project index and save it to a variable projectToBeFundedIndex
    if(e.target.classList.contains("donateBTN")){
        projectToBeFundedIndex = e.target.id;
    }
})


document.querySelector("#fundBTn").addEventListener("click", async (e) =>{
    notification("You have successfully funded the project!")
    // When the donate button is clicked it will get the project index and save it to a variable projectToBeFundedIndex

    // Get the project that is to be funded
   

    const projectToBeFunded = projects.find(project => project.index === parseInt(projectToBeFundedIndex));

    

    let amount = document.querySelector("#projectAmountToFund").value;
    amount =  new BigNumber(Math.round(amount)).shiftedBy(ERC20_DECIMALS).toString();
    notification("⌛ Waiting for payment approval...")
    try{

        await approve(amount);
    }
     catch (error) {
        notification(`⚠️ ${error}.`)
    }
  

    notification(`⌛ Awaiting payment for "${projectToBeFunded.projectName}"...`)
    try {

        const result = await contract.methods
          .pledgeToProject(projectToBeFunded.index, amount)
          .send({ from: kit.defaultAccount })
         
          notification(`🎉 You successfully bought "${projectToBeFunded.projectName}".`)
          await getProjects()
          await getBalance()

    } catch (error) {

      notification(`⚠️ ${error}.`)
    }

    // empty modal form
    const form = document.getElementById('projectForm')
    form.reset();


})




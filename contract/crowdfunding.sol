// SPDX-License-Identifier: MIT  

pragma solidity >=0.7.0 <0.9.0;

interface IERC20Token {
    function transfer(address, uint256) external returns (bool);
    function approve(address, uint256) external returns (bool);
    function transferFrom(address, address, uint256) external returns (bool);
    function totalSupply() external view returns (uint256);
    function balanceOf(address) external view returns (uint256);
    function allowance(address, address) external view returns (uint256);

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
}

contract CrowdFunding {

    uint internal projectsLength = 0;
    address internal cUsdTokenAddress = 0x874069Fa1Eb16D44d622F2e0Ca25eeA172369bC1;
    address public adminAddress;

    struct Project {
        address payable owner;
        string projectName;
        string projectImage;
        string projectDescription;
        string creatorName;
        uint goal;
        uint donationsMade;
        uint amountPledged;
        bool status;
        //        admin can flag bad campaigns
        bool flag;
    }


    mapping (uint => Project) internal projects;

    modifier isOwner(){
        require(adminAddress == msg.sender, "Only callable by admin");
        _;
    }

    modifier notFlagged(uint index){
        require( projects[index].flag != true, "Project has been flagged by admin");
        _;
    }


    constructor(){
        adminAddress = msg.sender;
    }

    function createProject
    (
        string memory _projectName,
        string memory _projectImage,
        string memory _projectDescription,
        string memory _creatorName,
        uint _goal
    ) public {
        uint _donationsMade = 0;
        uint _amountPledged = 0;
        bool _status = false;
        bool _flag = false;

        projects[projectsLength] = Project(
            payable(msg.sender),
            _projectName,
            _projectImage,
            _projectDescription,
            _creatorName,
            _goal,
            _donationsMade,
            _amountPledged,
            _status,
            _flag
        );
        projectsLength ++;
    }

    function readProduct(uint _index) public view returns (
        address payable,
        string memory,
        string memory,
        string memory,
        string memory,
        uint,
        uint,
        uint,
        bool,
        bool
    ) {
        Project memory project = projects[_index];
        require(  project.owner != address(0), "Project does not exist");
        return (
        project.owner,
        project.projectName,
        project.projectImage,
        project.projectDescription,
        project.creatorName,
        project.goal,
        project.amountPledged,
        project.donationsMade,
        project.status,
        project.flag

        );
    }

    function getProjectsLength() public view returns (uint) {
        return (projectsLength);
    }

    function pledgeToProject(uint _index, uint amount) public notFlagged(_index) {
        require(  projects[_index].owner != address(0), "Project does not exist");
        require(projects[_index].status == false, "Project has ended");

        // execute transfer if status of project is false
        require(
            IERC20Token(cUsdTokenAddress).transferFrom(
                msg.sender,
                projects[_index].owner,
                amount
            ),
            "Transfer failed."
        );
        projects[_index].amountPledged += amount;
        projects[_index].donationsMade++;
        if(projects[_index].amountPledged >= projects[_index].goal){
            projects[_index].status = true;
        }

    }

    //    admin functions

    function flagCampaign(uint _index) public isOwner {

        projects[_index].flag = true;

    }


}
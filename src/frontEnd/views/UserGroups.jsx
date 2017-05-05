import React from 'react';

import List from '../components/ItemList/List.jsx';
import Loading from '../components/Loading.jsx';
import NewGroupForm from '../components/Forms/AddNewUserGroup.jsx';
import PopupAddNew from '../components/PopupAddNew.jsx';
import {sendPostRequest, sendDeleteRequest} from '../helpers/HTTP_requests.js';
import UpperToolbar from '../components/UpperToolbar.jsx';

import {connect} from 'react-redux'


class UserGroups extends React.Component {

    constructor(props) {
        super(props);

        this.state = {
            addNewItemClicked: false,
            pendingOwnGroups: false,
            pendingOtherGroups: false,
            ownGroupsData: [],
            memberInGroupsData: [],
            editData: null,
        }
    }

    componentDidMount() {
        this.fetchOwnGroupsData();
        this.fetchMemberInGroupsData();
    }

    itemAction(type, data) {
        console.log("item action", type, data);
        switch (type) {
            case "addMember":
                this.setState({editData: data});
                break;
            case "removeGroup":
                this.setState({pendingOwnGroups: true});
                sendDeleteRequest("DELETE_USER_GROUP", {id: data._id}).then((data) => {
                    console.log("deleted", JSON.parse(data.text));
                    this.setState({pendingOwnGroups: false});
                    this.fetchOwnGroupsData();
                }, (err) => {

                });
                break;
            case "removeMember":
                this.setState({editData: data});
                break;
            case "update":
                this.setState({editData: data});
                break;

        }
    }

    fetchOwnGroupsData() {
        this.setState({pendingOwnGroups: true});
        sendPostRequest("GET_GROUPS_BY_OWNERSHIP", {}).then((data) => {
            console.log("owner", JSON.parse(data.text));
            this.setState({pendingOwnGroups: false, ownGroupsData: JSON.parse(data.text)});
        }, (err) => {

        });
    }

    fetchMemberInGroupsData() {
        this.setState({pendingOtherGroups: true});
        sendPostRequest("GET_GROUPS_BY_MEMBERSHIP", {}).then((data) => {
            console.log("member", JSON.parse(data.text));
            this.setState({pendingOtherGroups: false, memberInGroupsData: JSON.parse(data.text)});
        }, (err) => {

        });
    }

    addNewItemTrigger(state) {
        this.setState({addNewItemClicked: state, editData: null});
        this.fetchOwnGroupsData();
    }

    render() {
        const style = {
            clear: "both",
            paddingTop: 20,
        };
        let rowActions = [
            {title: this.props.dropDowns.edit, onClick: this.itemAction.bind(this, "update")},
            {title: this.props.dropDowns.addMember, onClick: this.itemAction.bind(this, "addMember")},
            {title: this.props.dropDowns.removeMember, onClick: this.itemAction.bind(this, "removeMember")},
            {title: this.props.dropDowns.removeGroup, onClick: this.itemAction.bind(this, "removeGroup")}
            ];

        return (
            <div>
                <h1>{this.props.content.userGroups}</h1>
                <UpperToolbar addNewItemTrigger={this.addNewItemTrigger.bind(this, true)}/>

                <div style={style}>
                    <h2>{this.props.content.myGroups}</h2>
                    {this.state.pendingOwnGroups ? <Loading/> : <List data={this.state.ownGroupsData}
                                                                      dropDownOptions={rowActions}
                                                                      additionalInfo={true}/>}
                    <h2>{this.props.content.memberIn}</h2>
                    {this.state.pendingOtherGroups ? <Loading/> : <List data={this.state.memberInGroupsData}
                                                                        additionalInfo={true}/>}
                </div>

                {
                    this.state.addNewItemClicked || this.state.editData !== null ?
                    <PopupAddNew close={this.addNewItemTrigger.bind(this, false)}
                                 title={this.state.editData === null ?
                                     this.props.content.createNew
                                     :
                                     this.props.content.updateGroup}>
                        <NewGroupForm editData={this.state.editData}
                                      cancel={this.addNewItemTrigger.bind(this, false)}/>
                    </PopupAddNew>
                    :
                    null
                }

            </div>
        )
    }
}

export default connect(
    (state) => ({
        content: state.switchLanguage.content.page.userGroups,
        dropDowns: state.switchLanguage.content.dropDowns,
    }),
    null
)(UserGroups)
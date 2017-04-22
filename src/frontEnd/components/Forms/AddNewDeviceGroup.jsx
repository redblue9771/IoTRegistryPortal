import React from 'react';

import InputLabelForm from './InputLabelForm.jsx';
import FormButtons from '../Buttons/FormButtons.jsx';
import {sendPostRequest} from '../../helpers/HTTP_requests.js';

import { connect } from 'react-redux'


class AddNewDeviceGroup extends React.Component {

    constructor(props) {
        super(props);

        this.state = {
            name: "",
            description: "",
            path: "",

            errorMsg: null,
            nameRequired: null,
            pending: false,
        }
    }

    handlerOnChange(name, evt) {
        let state = {};
        state[name] = evt.target.value;
        this.setState(state);
    }

    checkValidity(name) {
        let state = {};
        if (this.state[name] === "") {
            state[name + "Required"] = "has-error";
            this.setState(state);
            return false;
        }
        if (this.state[name] !== "" && this.state[name + "Required"] !== null) {
            state[name + "Required"] = null;
            this.setState(state);
        }
        return true;
    }

    handlerSubmitBtn() {
        let data = {
            name: this.state.name,
            description: this.state.description,
            path: this.state.path,
        };

        this.setState({pending: true});
        console.log("submitting", data);

        sendPostRequest("CREATE_DEVICE_GROUP", data).then((res) => {
            console.log("created", JSON.parse(res.text));
            this.setState({pending: false});
            this.props.cancel()
        }, (err) => {
            this.setState({errorMsg: JSON.parse(err.text).msg, pending: false});
        });
    }

    render() {
        let required = "Fill all required fields!";

        return (
            <div>
                <form style={{clear: "both"}}>
                    <InputLabelForm label={this.props.content.groupName}
                                    type="text"
                                    required={true}
                                    validity={this.state.nameRequired}
                                    onBlur={this.checkValidity.bind(this, "name")}
                                    onChange={this.handlerOnChange.bind(this, "name")}
                    />
                    <InputLabelForm label={this.props.content.description}
                                    type="text"
                                    onChange={this.handlerOnChange.bind(this, "description")}
                    />
                    <InputLabelForm label={this.props.content.path}
                                    type="text"
                                    onChange={this.handlerOnChange.bind(this, "path")}
                    />
                </form>

                <FormButtons submit={this.handlerSubmitBtn.bind(this)}
                             cancel={this.props.cancel}
                             errorMsg={
                                 this.state.nameRequired ?
                                     this.props.warnings.requiredFields
                                     :
                                     this.state.errorMsg}
                             pending={this.state.pending}
                />
            </div>
        )
    }
}

export default connect(
    (state) => ({
        content: state.switchLanguage.content.forms,
        warnings: state.switchLanguage.content.warnings,
    }),
    null
)(AddNewDeviceGroup)
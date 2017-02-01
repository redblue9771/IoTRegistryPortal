import Input from './Input.jsx';
import React , { PropTypes } from 'react';
import RememberHelp from './RememberHelp.jsx';

import 'bootstrap-social';

import { connect } from 'react-redux'
let actions = require('./../../actions/actions.js');


const Login = ({usernameOnChange, passwordOnChange, login, toggle, content, switchLanguage}) => {

    const switchL = () => {
        switchLanguage('lt');
    };

    return (
        <div>
            <div className="col-sm-7 col-md-6 col-lg-5 login">
                <form className="form-horizontal" role="form">
                    <Input onChange={usernameOnChange}
                           label={content.labels.username}
                           type="text"/>
                    <Input onChange={passwordOnChange}
                           label={content.labels.password}
                           type="password"/>

                    <RememberHelp data={content.messages}>
                        <div className="col-xs-4 col-sm-4 col-md-4 submit">
                            <button type="submit"
                                    onClick={login}
                                    className="btn btn-primary btn-lg"
                                    tabIndex="4">
                                {content.buttons.login}
                            </button>
                        </div>
                    </RememberHelp>
                </form>
            </div>

            <div className="col-sm-5 col-md-6 col-lg-7 details">
                <a className="btn btn-block btn-social btn-facebook">
                    <span className="fa fa-facebook"/>
                    {content.buttons.facebook}
                </a>
                <a className="btn btn-block btn-social btn-google">
                    <span className="fa fa-google"/>
                    {content.buttons.google}
                </a>
                <a onClick={switchL} className="btn btn-block btn-social btn-github">
                    <span className="fa fa-github"/>
                    {content.buttons.github}
                </a>

                <div>
                    OR
                    <button type="submit"
                            onClick={toggle}
                            className="btn btn-primary btn-lg"
                            tabIndex="4">
                        {content.buttons.register}
                    </button>
                </div>
            </div>
        </div>
    )
};

Login.propTypes = {
    //content: PropTypes.object.isRequired,
    //switchLanguage: PropTypes.function.isRequired,
};

export default connect(
    (state) => ({content: state.content.page.login}),
    (dispatch) => ({switchLanguage: (lang) => dispatch(actions.switchLanguage(lang))})
)(Login)
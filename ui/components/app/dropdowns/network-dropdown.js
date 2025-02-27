import PropTypes from 'prop-types';
import React, { Component } from 'react';
import { connect } from 'react-redux';
import { withRouter } from 'react-router-dom';
import { compose } from 'redux';
import { pickBy } from 'lodash';
import Button from '../../ui/button';
import * as actions from '../../../store/actions';
import { openAlert as displayInvalidCustomNetworkAlert } from '../../../ducks/alerts/invalid-custom-network';
import { getProviderConfig } from '../../../ducks/metamask/metamask';
import {
  BUILT_IN_NETWORKS,
  CHAIN_ID_TO_RPC_URL_MAP,
  LINEA_TESTNET_RPC_URL,
  LOCALHOST_RPC_URL,
  NETWORK_TO_NAME_MAP,
  NETWORK_TYPES,
  SHOULD_SHOW_LINEA_TESTNET_NETWORK,
} from '../../../../shared/constants/network';
import { isPrefixedFormattedHexString } from '../../../../shared/modules/network.utils';

import ColorIndicator from '../../ui/color-indicator';
import { IconColor, Size } from '../../../helpers/constants/design-system';
import { getShowTestNetworks } from '../../../selectors';
import { getEnvironmentType } from '../../../../app/scripts/lib/util';
import { ENVIRONMENT_TYPE_POPUP } from '../../../../shared/constants/app';
import {
  MetaMetricsEventCategory,
  MetaMetricsEventName,
  MetaMetricsNetworkEventSource,
} from '../../../../shared/constants/metametrics';
import {
  ADD_POPULAR_CUSTOM_NETWORK,
  ADVANCED_ROUTE,
} from '../../../helpers/constants/routes';

import { Icon, IconName, IconSize, ButtonIcon } from '../../component-library';

import { Dropdown, DropdownMenuItem } from './dropdown';

// classes from nodes of the toggle element.
const notToggleElementClassnames = [
  'menu-icon',
  'network-name',
  'network-indicator',
  'network-caret',
  'network-component',
  'modal-container__footer-button',
];

const DROP_DOWN_MENU_ITEM_STYLE = {
  fontSize: '16px',
  lineHeight: '20px',
  padding: '16px',
};

function mapStateToProps(state) {
  return {
    providerConfig: getProviderConfig(state),
    shouldShowTestNetworks: getShowTestNetworks(state),
    networkConfigurations: state.metamask.networkConfigurations,
    networkDropdownOpen: state.appState.networkDropdownOpen,
    showTestnetMessageInDropdown: state.metamask.showTestnetMessageInDropdown,
  };
}

function mapDispatchToProps(dispatch) {
  return {
    setProviderType: (type) => {
      dispatch(actions.setProviderType(type));
    },
    setActiveNetwork: (networkConfigurationId) => {
      dispatch(actions.setActiveNetwork(networkConfigurationId));
    },
    upsertNetworkConfiguration: (...args) =>
      dispatch(actions.upsertNetworkConfiguration(...args)),
    hideNetworkDropdown: () => dispatch(actions.hideNetworkDropdown()),
    displayInvalidCustomNetworkAlert: (networkName) => {
      dispatch(displayInvalidCustomNetworkAlert(networkName));
    },
    showConfirmDeleteNetworkModal: ({ target, onConfirm }) => {
      return dispatch(
        actions.showModal({
          name: 'CONFIRM_DELETE_NETWORK',
          target,
          onConfirm,
        }),
      );
    },
    hideTestNetMessage: () => actions.hideTestNetMessage(),
  };
}

class NetworkDropdown extends Component {
  static contextTypes = {
    t: PropTypes.func,
    trackEvent: PropTypes.func,
  };

  static propTypes = {
    providerConfig: PropTypes.shape({
      nickname: PropTypes.string,
      rpcUrl: PropTypes.string,
      type: PropTypes.string,
      ticker: PropTypes.string,
    }).isRequired,
    setProviderType: PropTypes.func.isRequired,
    setActiveNetwork: PropTypes.func.isRequired,
    hideNetworkDropdown: PropTypes.func.isRequired,
    networkConfigurations: PropTypes.object.isRequired,
    shouldShowTestNetworks: PropTypes.bool,
    networkDropdownOpen: PropTypes.bool.isRequired,
    displayInvalidCustomNetworkAlert: PropTypes.func.isRequired,
    showConfirmDeleteNetworkModal: PropTypes.func.isRequired,
    showTestnetMessageInDropdown: PropTypes.bool.isRequired,
    hideTestNetMessage: PropTypes.func.isRequired,
    history: PropTypes.object,
    dropdownStyles: PropTypes.object,
    hideElementsForOnboarding: PropTypes.bool,
    onAddClick: PropTypes.func,
    upsertNetworkConfiguration: PropTypes.func.isRequired,
  };

  handleClick(newProviderType) {
    const {
      providerConfig: { type: providerType },
      setProviderType,
    } = this.props;
    const { trackEvent } = this.context;

    trackEvent({
      category: MetaMetricsEventCategory.Navigation,
      event: MetaMetricsEventName.NavNetworkSwitched,
      properties: {
        from_network: providerType,
        to_network: newProviderType,
      },
    });
    setProviderType(newProviderType);
  }

  renderAddCustomButton() {
    const { onAddClick } = this.props;
    return (
      <div className="network__add-network-button">
        <Button
          type="secondary"
          onClick={() => {
            if (onAddClick) {
              onAddClick();
            } else {
              getEnvironmentType() === ENVIRONMENT_TYPE_POPUP
                ? global.platform.openExtensionInBrowser(
                    ADD_POPULAR_CUSTOM_NETWORK,
                  )
                : this.props.history.push(ADD_POPULAR_CUSTOM_NETWORK);
            }
            this.props.hideNetworkDropdown();
          }}
        >
          {this.context.t('addNetwork')}
        </Button>
      </div>
    );
  }

  renderCustomRpcList(networkConfigurations, providerConfig, opts = {}) {
    return Object.entries(networkConfigurations).map(
      ([networkConfigurationId, networkConfiguration]) => {
        const { rpcUrl, chainId, nickname = '', id } = networkConfiguration;
        const isCurrentRpcTarget =
          providerConfig.type === NETWORK_TYPES.RPC &&
          rpcUrl === providerConfig.rpcUrl;
        return (
          <DropdownMenuItem
            key={`common${rpcUrl}`}
            closeMenu={() => this.props.hideNetworkDropdown()}
            onClick={() => {
              if (isPrefixedFormattedHexString(chainId)) {
                this.props.setActiveNetwork(networkConfigurationId);
              } else {
                this.props.displayInvalidCustomNetworkAlert(nickname || rpcUrl);
              }
            }}
            style={{
              fontSize: '16px',
              lineHeight: '20px',
              padding: '16px',
            }}
          >
            {isCurrentRpcTarget ? (
              <Icon name={IconName.Check} color={IconColor.successDefault} />
            ) : (
              <div className="network-check__transparent">✓</div>
            )}
            <ColorIndicator
              color={opts.isLocalHost ? 'localhost' : IconColor.iconMuted}
              size={Size.LG}
              type={ColorIndicator.TYPES.FILLED}
            />
            <span
              className="network-name-item"
              data-testid={`${nickname}-network-item`}
              style={{
                color: isCurrentRpcTarget
                  ? 'var(--color-text-default)'
                  : 'var(--color-text-alternative)',
              }}
            >
              {nickname || rpcUrl}
            </span>
            {isCurrentRpcTarget ? null : (
              <ButtonIcon
                className="delete"
                iconName={IconName.Close}
                size={IconSize.Sm}
                ariaLabel={this.context.t('delete')}
                onClick={(e) => {
                  e.stopPropagation();
                  this.props.showConfirmDeleteNetworkModal({
                    target: id,
                    onConfirm: () => undefined,
                  });
                }}
              />
            )}
          </DropdownMenuItem>
        );
      },
    );
  }

  renderNetworkEntry(network) {
    const {
      providerConfig: { type: providerType },
    } = this.props;
    return (
      <DropdownMenuItem
        key={network}
        closeMenu={this.props.hideNetworkDropdown}
        onClick={() => this.handleClick(network)}
        style={DROP_DOWN_MENU_ITEM_STYLE}
      >
        {providerType === network ? (
          <Icon name={IconName.Check} color={IconColor.successDefault} />
        ) : (
          <div className="network-check__transparent">✓</div>
        )}
        <ColorIndicator
          color={network}
          size={Size.LG}
          type={ColorIndicator.TYPES.FILLED}
        />
        <span
          className="network-name-item"
          data-testid={`${network}-network-item`}
          style={{
            color:
              providerType === network
                ? 'var(--color-text-default)'
                : 'var(--color-text-alternative)',
          }}
        >
          {this.context.t(network)}
        </span>
      </DropdownMenuItem>
    );
  }

  renderNonInfuraDefaultNetwork(networkConfigurations, network) {
    const { providerConfig, setActiveNetwork, upsertNetworkConfiguration } =
      this.props;

    const { chainId, ticker, blockExplorerUrl } = BUILT_IN_NETWORKS[network];
    const networkName = NETWORK_TO_NAME_MAP[network];
    const rpcUrl = CHAIN_ID_TO_RPC_URL_MAP[chainId];

    const isCurrentRpcTarget =
      providerConfig.type === NETWORK_TYPES.RPC &&
      rpcUrl === providerConfig.rpcUrl;
    return (
      <DropdownMenuItem
        key={network}
        closeMenu={this.props.hideNetworkDropdown}
        onClick={async () => {
          const networkConfiguration = pickBy(
            networkConfigurations,
            (config) => config.rpcUrl === CHAIN_ID_TO_RPC_URL_MAP[chainId],
          );

          let configurationId = null;
          // eslint-disable-next-line no-extra-boolean-cast, no-implicit-coercion
          if (!!networkConfiguration) {
            configurationId = await upsertNetworkConfiguration(
              {
                rpcUrl,
                ticker,
                chainId,
                nickname: networkName,
                rpcPrefs: {
                  blockExplorerUrl,
                },
              },
              {
                setActive: true,
                source: MetaMetricsNetworkEventSource.CustomNetworkForm,
              },
            );
          }
          setActiveNetwork(configurationId);
        }}
        style={DROP_DOWN_MENU_ITEM_STYLE}
      >
        {isCurrentRpcTarget ? (
          <Icon name={IconName.Check} color={IconColor.successDefault} />
        ) : (
          <div className="network-check__transparent">✓</div>
        )}
        <ColorIndicator
          color={network}
          size={Size.LG}
          type={ColorIndicator.TYPES.FILLED}
        />
        <span
          className="network-name-item"
          data-testid={`${network}-network-item`}
          style={{
            color:
              providerConfig.type === network
                ? 'var(--color-text-default)'
                : 'var(--color-text-alternative)',
          }}
        >
          {this.context.t(network)}
        </span>
      </DropdownMenuItem>
    );
  }

  render() {
    const {
      history,
      hideElementsForOnboarding,
      hideNetworkDropdown,
      shouldShowTestNetworks,
      showTestnetMessageInDropdown,
      hideTestNetMessage,
      networkConfigurations,
    } = this.props;

    const rpcListDetailWithoutLocalHostAndLinea = pickBy(
      networkConfigurations,
      (config) =>
        config.rpcUrl !== LOCALHOST_RPC_URL &&
        config.rpcUrl !== LINEA_TESTNET_RPC_URL,
    );
    const rpcListDetailForLocalHost = pickBy(
      networkConfigurations,
      (config) => config.rpcUrl === LOCALHOST_RPC_URL,
    );

    const isOpen = this.props.networkDropdownOpen;
    const { t } = this.context;

    return (
      <Dropdown
        isOpen={isOpen}
        onClickOutside={(event) => {
          const { classList } = event.target;
          const isInClassList = (className) => classList.contains(className);
          const notToggleElementIndex =
            notToggleElementClassnames.findIndex(isInClassList);

          if (notToggleElementIndex === -1) {
            event.stopPropagation();
            hideNetworkDropdown();
          }
        }}
        containerClassName="network-droppo"
        zIndex={55}
        style={
          this.props.dropdownStyles || {
            position: 'absolute',
            top: '58px',
            width: '309px',
            zIndex: '55',
          }
        }
        innerStyle={{
          padding: '16px 0',
        }}
      >
        <div className="network-dropdown-header">
          {hideElementsForOnboarding ? null : (
            <div className="network-dropdown-title">{t('networks')}</div>
          )}
          {hideElementsForOnboarding ? null : (
            <div className="network-dropdown-divider" />
          )}
          {showTestnetMessageInDropdown && !hideElementsForOnboarding ? (
            <div className="network-dropdown-content">
              {t('toggleTestNetworks', [
                <a
                  href="#"
                  key="advancedSettingsLink"
                  className="network-dropdown-content--link"
                  onClick={(e) => {
                    e.preventDefault();
                    hideNetworkDropdown();
                    history.push(`${ADVANCED_ROUTE}#show-testnets`);
                  }}
                >
                  {t('showHide')}
                </a>,
              ])}
              <Button
                onClick={hideTestNetMessage}
                className="network-dropdown-content--dismiss"
              >
                {t('dismiss')}
              </Button>
            </div>
          ) : null}
        </div>

        <div className="network-dropdown-list">
          {this.renderNetworkEntry(NETWORK_TYPES.MAINNET)}

          {this.renderCustomRpcList(
            rpcListDetailWithoutLocalHostAndLinea,
            this.props.providerConfig,
          )}

          {shouldShowTestNetworks && (
            <>
              {this.renderNetworkEntry(NETWORK_TYPES.GOERLI)}
              {this.renderNetworkEntry(NETWORK_TYPES.SEPOLIA)}
              {SHOULD_SHOW_LINEA_TESTNET_NETWORK && (
                <>
                  {this.renderNonInfuraDefaultNetwork(
                    networkConfigurations,
                    NETWORK_TYPES.LINEA_TESTNET,
                  )}
                </>
              )}
              {this.renderCustomRpcList(
                rpcListDetailForLocalHost,
                this.props.providerConfig,
                { isLocalHost: true },
              )}
            </>
          )}
        </div>

        {this.renderAddCustomButton()}
      </Dropdown>
    );
  }
}

export default compose(
  withRouter,
  connect(mapStateToProps, mapDispatchToProps),
)(NetworkDropdown);

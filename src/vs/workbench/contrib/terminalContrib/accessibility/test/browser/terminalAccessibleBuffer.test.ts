/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { strictEqual } from 'assert';
import { Emitter } from 'vs/base/common/event';
import { isWindows } from 'vs/base/common/platform';
import { ICodeEditorService } from 'vs/editor/browser/services/codeEditorService';
import { IEditorOptions } from 'vs/editor/common/config/editorOptions';
import { ILanguageFeaturesService } from 'vs/editor/common/services/languageFeatures';
import { LanguageFeaturesService } from 'vs/editor/common/services/languageFeaturesService';
import { TestCodeEditorService } from 'vs/editor/test/browser/editorTestServices';
import { IAccessibilityService } from 'vs/platform/accessibility/common/accessibility';
import { TestAccessibilityService } from 'vs/platform/accessibility/test/common/testAccessibilityService';
import { IConfigurationService } from 'vs/platform/configuration/common/configuration';
import { TestConfigurationService } from 'vs/platform/configuration/test/common/testConfigurationService';
import { ContextKeyService } from 'vs/platform/contextkey/browser/contextKeyService';
import { IContextKeyService } from 'vs/platform/contextkey/common/contextkey';
import { ContextMenuService } from 'vs/platform/contextview/browser/contextMenuService';
import { IContextMenuService } from 'vs/platform/contextview/browser/contextView';
import { TestInstantiationService } from 'vs/platform/instantiation/test/common/instantiationServiceMock';
import { MockContextKeyService } from 'vs/platform/keybinding/test/common/mockKeybindingService';
import { ILogService, NullLogService } from 'vs/platform/log/common/log';
import { IStorageService } from 'vs/platform/storage/common/storage';
import { TerminalCapability } from 'vs/platform/terminal/common/capabilities/capabilities';
import { TerminalCapabilityStore } from 'vs/platform/terminal/common/capabilities/terminalCapabilityStore';
import { IThemeService } from 'vs/platform/theme/common/themeService';
import { TestThemeService } from 'vs/platform/theme/test/common/testThemeService';
import { IViewDescriptorService } from 'vs/workbench/common/views';
import { TestViewDescriptorService } from 'vs/workbench/contrib/comments/test/browser/commentsView.test';
import { ITerminalInstance } from 'vs/workbench/contrib/terminal/browser/terminal';
import { TerminalConfigHelper } from 'vs/workbench/contrib/terminal/browser/terminalConfigHelper';
import { getTerminalUri } from 'vs/workbench/contrib/terminal/browser/terminalUri';
import { XtermTerminal } from 'vs/workbench/contrib/terminal/browser/xterm/xtermTerminal';
import { ITerminalConfiguration } from 'vs/workbench/contrib/terminal/common/terminal';
import { AccessibleBufferWidget } from 'vs/workbench/contrib/terminalContrib/accessibility/browser/terminalAccessibleBuffer';
import { ILifecycleService } from 'vs/workbench/services/lifecycle/common/lifecycle';
import { TestLifecycleService } from 'vs/workbench/test/browser/workbenchTestServices';
import { TestStorageService } from 'vs/workbench/test/common/workbenchTestServices';
import { Terminal } from 'xterm';
class TestXtermTerminal extends XtermTerminal {

}

const defaultTerminalConfig: Partial<ITerminalConfiguration> = {
	fontFamily: 'monospace',
	fontWeight: 'normal',
	fontWeightBold: 'normal',
	gpuAcceleration: 'off',
	scrollback: 1000,
	fastScrollSensitivity: 2,
	mouseWheelScrollSensitivity: 1,
	unicodeVersion: '6'
};

suite('Accessible buffer', () => {
	let instantiationService: TestInstantiationService;
	let configurationService: TestConfigurationService;
	let themeService: TestThemeService;
	let viewDescriptorService: TestViewDescriptorService;
	let xterm: TestXtermTerminal;
	let capabilities: TerminalCapabilityStore;
	let configHelper: TerminalConfigHelper;
	let terminalInstance: Pick<ITerminalInstance, 'capabilities' | 'onDidRequestFocus' | 'resource'>;
	let accessibleBufferWidget: AccessibleBufferWidget;

	setup(() => {
		configurationService = new TestConfigurationService({
			editor: {
				fastScrollSensitivity: 2,
				mouseWheelScrollSensitivity: 1
			} as Partial<IEditorOptions>,
			terminal: {
				integrated: defaultTerminalConfig
			}
		});
		themeService = new TestThemeService();
		viewDescriptorService = new TestViewDescriptorService();

		instantiationService = new TestInstantiationService();
		instantiationService.stub(IConfigurationService, configurationService);
		instantiationService.stub(ILogService, new NullLogService());
		instantiationService.stub(IStorageService, new TestStorageService());
		instantiationService.stub(IThemeService, themeService);
		instantiationService.stub(IAccessibilityService, new TestAccessibilityService());
		instantiationService.stub(IContextKeyService, new ContextKeyService(configurationService));
		instantiationService.stub(ILanguageFeaturesService, new LanguageFeaturesService());
		instantiationService.stub(IViewDescriptorService, viewDescriptorService);
		instantiationService.stub(IContextMenuService, instantiationService.createInstance(ContextMenuService));
		instantiationService.stub(ILifecycleService, new TestLifecycleService());
		instantiationService.stub(ICodeEditorService, new TestCodeEditorService(themeService));
		configHelper = instantiationService.createInstance(TerminalConfigHelper);
		xterm = instantiationService.createInstance(TestXtermTerminal, Terminal, configHelper, 80, 30, { getBackgroundColor: () => undefined }, new TerminalCapabilityStore(), new MockContextKeyService().createKey('', true)!, true);
		const container = document.createElement('div');
		xterm.raw.open(container);
		configurationService = new TestConfigurationService({ terminal: { integrated: { tabs: { separator: ' - ', title: '${cwd}', description: '${cwd}' } } } });
		configHelper = new TerminalConfigHelper(configurationService, null!, null!, null!, null!);
		capabilities = new TerminalCapabilityStore();
		if (!isWindows) {
			capabilities.add(TerminalCapability.NaiveCwdDetection, null!);
		}
		terminalInstance = { capabilities, onDidRequestFocus: new Emitter<void>().event, resource: getTerminalUri('workspaceID', 2, 'title') };
		accessibleBufferWidget = instantiationService.createInstance(AccessibleBufferWidget, terminalInstance, xterm);
	});
	test.skip('should clear cached lines', () => {
		accessibleBufferWidget.show();
		strictEqual(accessibleBufferWidget.lines.length, 1);
		xterm._writeText('abcd'.repeat(1000));
		xterm._writeText('b'.repeat(80));
		strictEqual(accessibleBufferWidget.lines.length, 2);
		xterm.clearBuffer();
		accessibleBufferWidget.show();
		strictEqual(accessibleBufferWidget.lines.length, 1);
	});
});

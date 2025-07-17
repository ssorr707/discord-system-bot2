const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { createSuccessEmbed, createErrorEmbed, createInfoEmbed } = require('../../utils/embeds');
const { checkPermissions } = require('../../utils/permissions');
const { welcome } = require('../../utils/database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('welcome-message')
        .setDescription('Customize welcome messages')
        .addSubcommand(subcommand =>
            subcommand
                .setName('set')
                .setDescription('Set the welcome message')
                .addStringOption(option => 
                    option.setName('message')
                        .setDescription('The welcome message (use {user} for the username, {server} for the server name)')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('set-dm')
                .setDescription('Set the welcome DM message')
                .addStringOption(option => 
                    option.setName('message')
                        .setDescription('The welcome DM message (use {user} for the username, {server} for the server name)')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('toggle-dm')
                .setDescription('Toggle whether to send a DM to new members')
                .addBooleanOption(option => 
                    option.setName('enabled')
                        .setDescription('Whether to enable or disable welcome DMs')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('toggle-image')
                .setDescription('Toggle whether to include a welcome image')
                .addBooleanOption(option => 
                    option.setName('enabled')
                        .setDescription('Whether to enable or disable welcome images')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('set-color')
                .setDescription('Set the color for the welcome message')
                .addStringOption(option => 
                    option.setName('color')
                        .setDescription('The color for the welcome message (hex code)')
                        .setRequired(true)))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
    
    async execute(interaction) {
        if (!checkPermissions(interaction, [PermissionFlagsBits.ManageGuild])) {
            return interaction.reply({ 
                embeds: [createErrorEmbed('Permission Denied', 'You need the Manage Server permission to use this command.')],
                ephemeral: true
            });
        }
        
        const subcommand = interaction.options.getSubcommand();
        
        try {
            const settings = welcome.getSettings(interaction.guild.id);
            
            if (!settings.channelId) {
                return interaction.reply({ 
                    embeds: [createErrorEmbed('Setup Required', 'Please set up the welcome system first using `/welcome-setup`.')],
                    ephemeral: true
                });
            }
            
            if (subcommand === 'set') {
                const message = interaction.options.getString('message');
                welcome.updateSettings(interaction.guild.id, { message });
                
                const embed = createSuccessEmbed(
                    'Welcome Message Updated',
                    'The welcome message has been updated.'
                )
                .addFields({ name: 'New Message', value: message });
                
                await interaction.reply({ embeds: [embed] });
            } else if (subcommand === 'set-dm') {
                const message = interaction.options.getString('message');
                welcome.updateSettings(interaction.guild.id, { dmMessage: message });
                
                const embed = createSuccessEmbed(
                    'Welcome DM Message Updated',
                    'The welcome DM message has been updated.'
                )
                .addFields({ name: 'New Message', value: message });
                
                await interaction.reply({ embeds: [embed] });
            } else if (subcommand === 'toggle-dm') {
                const enabled = interaction.options.getBoolean('enabled');
                welcome.updateSettings(interaction.guild.id, { sendDM: enabled });
                
                const embed = createSuccessEmbed(
                    'Welcome DMs Toggled',
                    `Welcome DMs have been ${enabled ? 'enabled' : 'disabled'}.`
                );
                
                await interaction.reply({ embeds: [embed] });
            } else if (subcommand === 'toggle-image') {
                const enabled = interaction.options.getBoolean('enabled');
                welcome.updateSettings(interaction.guild.id, { useImage: enabled });
                
                const embed = createSuccessEmbed(
                    'Welcome Images Toggled',
                    `Welcome images have been ${enabled ? 'enabled' : 'disabled'}.`
                );
                
                await interaction.reply({ embeds: [embed] });
            } else if (subcommand === 'set-color') {
                const color = interaction.options.getString('color');
                
                // Validate color
                if (!/^#[0-9A-F]{6}$/i.test(color)) {
                    return interaction.reply({ 
                        embeds: [createErrorEmbed('Invalid Color', 'Please provide a valid hex color code (e.g., #7289DA).')],
                        ephemeral: true
                    });
                }
                
                welcome.updateSettings(interaction.guild.id, { color });
                
                const embed = createSuccessEmbed(
                    'Welcome Color Updated',
                    'The welcome message color has been updated.'
                )
                .addFields({ name: 'New Color', value: color })
                .setColor(color);
                
                await interaction.reply({ embeds: [embed] });
            }
        } catch (error) {
            console.error('Error customizing welcome messages:', error);
            
            await interaction.reply({ 
                embeds: [createErrorEmbed('Error', 'An error occurred while customizing welcome messages.')],
                ephemeral: true
            });
        }
    }
};
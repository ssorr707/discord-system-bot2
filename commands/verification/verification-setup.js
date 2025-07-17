const { SlashCommandBuilder, PermissionFlagsBits, ChannelType, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { verification } = require('../../utils/database');
const { createSuccessEmbed, createErrorEmbed } = require('../../utils/embeds');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('verification-setup')
        .setDescription('Set up the verification system')
        .addChannelOption(option => 
            option.setName('channel')
                .setDescription('The channel where users will verify themselves')
                .setRequired(true)
                .addChannelTypes(ChannelType.GuildText))
        .addRoleOption(option => 
            option.setName('verified_role')
                .setDescription('The role to give to verified users')
                .setRequired(true))
        .addRoleOption(option => 
            option.setName('unverified_role')
                .setDescription('The role to give to unverified users (optional)')
                .setRequired(false))
        .addChannelOption(option => 
            option.setName('log_channel')
                .setDescription('The channel to log verification events (optional)')
                .setRequired(false)
                .addChannelTypes(ChannelType.GuildText))
        .addStringOption(option => 
            option.setName('welcome_message')
                .setDescription('The message to show in the verification channel')
                .setRequired(false))
        .addStringOption(option => 
            option.setName('method')
                .setDescription('The verification method to use')
                .setRequired(false)
                .addChoices(
                    { name: 'Captcha', value: 'captcha' },
                    { name: 'Reaction', value: 'reaction' },
                    { name: 'Button', value: 'button' }
                ))
        .addBooleanOption(option => 
            option.setName('auto_kick')
                .setDescription('Whether to automatically kick users who don\'t verify within the time limit')
                .setRequired(false))
        .addIntegerOption(option => 
            option.setName('auto_kick_timeout')
                .setDescription('The time in minutes before unverified users are kicked (if auto_kick is enabled)')
                .setRequired(false)
                .setMinValue(5)
                .setMaxValue(1440)) // Max 24 hours
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
    
    async execute(interaction) {
        try {
            // Check permissions
            if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
                return interaction.reply({ 
                    embeds: [createErrorEmbed('Permission Denied', 'You need the Manage Server permission to use this command.')],
                    ephemeral: true
                });
            }
            
            // Get options
            const channel = interaction.options.getChannel('channel');
            const verifiedRole = interaction.options.getRole('verified_role');
            const unverifiedRole = interaction.options.getRole('unverified_role');
            const logChannel = interaction.options.getChannel('log_channel');
            const welcomeMessage = interaction.options.getString('welcome_message') || 
                'Welcome to the server! Please verify yourself to access all channels.';
            const method = interaction.options.getString('method') || 'captcha';
            const autoKick = interaction.options.getBoolean('auto_kick') || false;
            const autoKickTimeout = interaction.options.getInteger('auto_kick_timeout') || 30; // Default 30 minutes
            
            // Check if the bot has permission to manage the verification channel
            if (!channel.permissionsFor(interaction.guild.members.me).has(PermissionFlagsBits.SendMessages)) {
                return interaction.reply({ 
                    embeds: [createErrorEmbed('Permission Error', `I don't have permission to send messages in ${channel}.`)],
                    ephemeral: true
                });
            }
            
            // Check if the bot can manage the verified role
            if (verifiedRole.position >= interaction.guild.members.me.roles.highest.position) {
                return interaction.reply({ 
                    embeds: [createErrorEmbed('Role Error', `I can't assign the verified role because it's higher than my highest role.`)],
                    ephemeral: true
                });
            }
            
            // Check unverified role if provided
            if (unverifiedRole && unverifiedRole.position >= interaction.guild.members.me.roles.highest.position) {
                return interaction.reply({ 
                    embeds: [createErrorEmbed('Role Error', `I can't assign the unverified role because it's higher than my highest role.`)],
                    ephemeral: true
                });
            }
            
            // Update verification settings
            verification.updateSettings(interaction.guild.id, {
                enabled: true,
                verificationChannelId: channel.id,
                logChannelId: logChannel ? logChannel.id : null,
                verifiedRoleId: verifiedRole.id,
                unverifiedRoleId: unverifiedRole ? unverifiedRole.id : null,
                welcomeMessage,
                method,
                autoKick,
                autoKickTimeout: autoKickTimeout * 60000 // Convert to milliseconds
            });
            
            // Create verification embed
            const verificationEmbed = new EmbedBuilder()
                .setColor('#5865F2')
                .setTitle('Server Verification')
                .setDescription(welcomeMessage)
                .addFields(
                    { name: 'Why Verify?', value: 'Verification helps us protect our community from spam and automated accounts.' },
                    { name: 'How to Verify', value: method === 'captcha' ? 
                        'Click the button below and solve the captcha to verify yourself.' : 
                        method === 'reaction' ? 
                        'React to this message with ✅ to verify yourself.' : 
                        'Click the button below to verify yourself.' 
                    }
                )
                .setFooter({ text: `Verification System • ${interaction.guild.name}` })
                .setTimestamp();
            
            // Create verification components
            let components = [];
            
            if (method === 'captcha' || method === 'button') {
                const row = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId('verify_button')
                            .setLabel('Verify')
                            .setStyle(ButtonStyle.Primary)
                            .setEmoji('✅')
                    );
                
                components.push(row);
            }
            
            // Send verification message
            const verificationMessage = await channel.send({ 
                embeds: [verificationEmbed],
                components
            });
            
            // If using reaction method, add the reaction
            if (method === 'reaction') {
                await verificationMessage.react('✅');
            }
            
            // Update settings with message ID
            verification.updateSettings(interaction.guild.id, {
                verificationMessageId: verificationMessage.id
            });
            
            // Send confirmation
            const embed = createSuccessEmbed(
                'Verification System Setup',
                'The verification system has been set up successfully.'
            )
            .addFields(
                { name: 'Verification Channel', value: `${channel}`, inline: true },
                { name: 'Verified Role', value: `${verifiedRole}`, inline: true },
                { name: 'Method', value: method.charAt(0).toUpperCase() + method.slice(1), inline: true }
            );
            
            if (unverifiedRole) {
                embed.addFields({ name: 'Unverified Role', value: `${unverifiedRole}`, inline: true });
            }
            
            if (logChannel) {
                embed.addFields({ name: 'Log Channel', value: `${logChannel}`, inline: true });
            }
            
            if (autoKick) {
                embed.addFields({ name: 'Auto Kick', value: `Enabled (${autoKickTimeout} minutes)`, inline: true });
            }
            
            await interaction.reply({ embeds: [embed] });
        } catch (error) {
            console.error('Error setting up verification system:', error);
            
            await interaction.reply({ 
                embeds: [createErrorEmbed('Error', 'An error occurred while setting up the verification system.')],
                ephemeral: true
            });
        }
    }
};